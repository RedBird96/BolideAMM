import {
  CACHE_MANAGER,
  CacheStore,
  forwardRef,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import type {
  ContractCallContext,
  ContractCallResults,
} from 'ethereum-multicall';
import { Multicall } from 'ethereum-multicall';
import type { CallContext } from 'ethereum-multicall/dist/esm/models';
import { isNil } from 'lodash';
import { ERROR_CODES } from 'src/common/constants/error-codes';
import { PLATFORMS } from 'src/common/constants/platforms';
import { LogicException } from 'src/common/logic.exception';
import { fromWeiToNum, toBN } from 'src/common/utils/big-number-utils';
import type { BigNumber } from 'src/common/utils/BigNumber';
import { BlockchainsService } from 'src/modules/blockchains/blockchains.service';
import { LP_TOKEN } from 'src/modules/bnb/bolide/lp-token';
import { CONTRACT_TYPES } from 'src/modules/contracts/constants/contract-types';
import { ContractsService } from 'src/modules/contracts/contracts.service';
import type { InnerTokenDto } from 'src/modules/contracts/dto/InnerTokenDataDto';
import type Web3 from 'web3';
import type { Contract } from 'web3-eth-contract';
import type { AbiItem } from 'web3-utils';

import { APESWAP_MASTER_CHEF } from '../apeswap/master-chef';
import { BnbUtilsService } from '../bnb-utils.service';
import { BnbWeb3Service } from '../bnb-web3.service';
import { ERC_20 } from '../bolide/erc-20';
import { BOLIDE_MASTER_CHEF } from '../bolide/master-chef-bolide';
import type { Farm } from '../interfaces/farm.interface';
import type { FarmLpPriceInfo } from '../interfaces/farm-lp-price-info.interface';
import type { FarmRewardsInfo } from '../interfaces/farm-rewards-info.iterface';
import { PANCAKE_MASTER_CHEF } from '../pancake/master-chef';
import { PancakeEthService } from '../pancake/pancake-eth.service';
import { FarmEthService } from './farm-eth.service';
import { abi as MASTER_CHEF_BISWAP } from './master-chef-biswap';

const EMISSION_PER_BLOCK_LIST_CACHE = 'emission_per_block_list_cache';
const CACHE_TTL_SECONDS = 60 * 60 * 12; // 12 hours

export interface BiSwapPoolInfo {
  allocPoint: number;
  lastRewardBlock: number;
  accBSWPerShare: number;
  lpToken: string;
}

export interface ApeSwapPoolInfo {
  allocPoint: number;
  lastRewardBlock: number;
  accCakePerShare: number;
  lpToken: string;
}

export interface PancakePoolInfo {
  allocPoint: number;
  lastRewardBlock: number;
  accCakePerShare: number;
  totalBoostedShare: number;
  isRegular: boolean;
}

type SwapPoolInfo = BiSwapPoolInfo | ApeSwapPoolInfo | PancakePoolInfo;

export interface FarmPool {
  platform: PLATFORMS;
  pid: number;
  pool: SwapPoolInfo;
  contract: Contract;
  reserve1: BigNumber;
  reserve2: BigNumber;
  totalSupply: BigNumber;
  token1Address: string;
  token2Address: string;
  token1Name: string;
  token2Name: string;
  isBorrowable: boolean;
}

@Injectable()
export class FarmAnalyticService {
  private readonly logger = new Logger(FarmAnalyticService.name);

  constructor(
    private readonly bnbUtilsService: BnbUtilsService,
    @Inject(forwardRef(() => FarmEthService))
    private readonly farmEthService: FarmEthService,
    private readonly blockchainsService: BlockchainsService,
    private readonly contractsService: ContractsService,
    @Inject(CACHE_MANAGER)
    private cacheManager: CacheStore,
    private web3Service: BnbWeb3Service,
    @Inject(forwardRef(() => PancakeEthService))
    private pancakeEthService: PancakeEthService,
  ) {}

  async getTotalAllocPoint(data: {
    platform: PLATFORMS;
    blockchainId: number;
    web3: Web3;
  }): Promise<number> {
    try {
      const farmContract = await this.farmEthService.getMasterchefContract(
        data,
      );

      return farmContract.methods.totalAllocPoint().call();
    } catch (error) {
      this.logger.error('getTotalAllocPoint', error);
    }
  }

  async getFarmRewardsInfo(data: {
    farmPool: FarmPool;
    lpInfo: FarmLpPriceInfo;
    rewardTokenPrice: number;
    blockchainId: number;
    totalAllocPoint: number;
    web3: Web3;
  }): Promise<FarmRewardsInfo> {
    const {
      farmPool,
      lpInfo,
      rewardTokenPrice,
      blockchainId,
      totalAllocPoint,
      web3,
    } = data;

    try {
      const farmAllocPoint = farmPool.pool.allocPoint;
      const poolLiquidityUsd = lpInfo.totalSupply * lpInfo.lpPrice;
      const poolWeight = farmAllocPoint / totalAllocPoint;

      const apr = await this.getFarmApr({
        poolWeight,
        cakePriceUsd: rewardTokenPrice,
        poolLiquidityUsd,
        platform: farmPool.platform,
        blockchainId,
        web3,
      });

      return {
        apr,
        poolLiquidityUsd,
        poolWeight,
      };
    } catch (error) {
      this.logger.error({
        message: 'getFarmRewardsInfo apr',
        error,
        farmPool,
        lpInfo,
        blockchainId,
      });
    }
  }

  async getEmissionPerBlock(data: { blockchainId: number; web3: Web3 }) {
    const { blockchainId, web3 } = data;

    let result = {};

    const resultStr: string = await this.cacheManager.get(
      EMISSION_PER_BLOCK_LIST_CACHE,
    );

    if (!isNil(resultStr)) {
      result = JSON.parse(resultStr);
    } else {
      const pancakeContract = await this.createMasterChefContract({
        platform: PLATFORMS.PANCAKESWAP,
        blockchainId,
        web3,
      });

      const apeSwapContract = await this.createMasterChefContract({
        platform: PLATFORMS.APESWAP,
        blockchainId,
        web3,
      });

      const biSwapContract = await this.createMasterChefContract({
        platform: PLATFORMS.BISWAP,
        blockchainId,
        web3,
      });

      let cakePerBlock;
      let apePerBlock;
      let bswPerBlock;

      try {
        const isRegular = true;

        const [cpr, apb, bpb] = await Promise.all([
          pancakeContract.methods.cakePerBlock(isRegular).call(),
          apeSwapContract.methods.cakePerBlock().call(),
          biSwapContract.methods.BSWPerBlock().call(),
        ]);

        cakePerBlock = cpr;
        apePerBlock = apb;
        bswPerBlock = bpb;
      } catch (error) {
        this.logger.error({ message: 'get cake per block', error });
      }

      result[PLATFORMS.PANCAKESWAP] = fromWeiToNum(toBN(cakePerBlock));
      result[PLATFORMS.APESWAP] = fromWeiToNum(toBN(apePerBlock));
      result[PLATFORMS.BISWAP] = fromWeiToNum(toBN(bswPerBlock));

      const cacheStr = JSON.stringify(result);

      await this.cacheManager.set(EMISSION_PER_BLOCK_LIST_CACHE, cacheStr, {
        ttl: CACHE_TTL_SECONDS,
      });
    }

    return result;
  }

  /**
   * Get farm APR values in %
   * @param poolWeight allocationPoint / totalAllocationPoint
   * @param cakePriceUsd Cake price in USD
   * @param poolLiquidityUsd Total pool liquidity in USD
   * @param platform
   * @returns Farm Apr
   */
  async getFarmApr(data: {
    poolWeight: number;
    cakePriceUsd: number;
    poolLiquidityUsd: number;
    platform: PLATFORMS;
    blockchainId: number;
    web3: Web3;
  }): Promise<number> {
    const apr = 0;

    try {
      const {
        poolWeight,
        poolLiquidityUsd,
        cakePriceUsd,
        platform,
        blockchainId,
        web3,
      } = data;

      const BSC_BLOCK_TIME = 3;

      const cakePerBlockInfo = await this.getEmissionPerBlock({
        blockchainId,
        web3,
      });

      const CAKE_PER_BLOCK = cakePerBlockInfo[platform];
      const BLOCKS_PER_YEAR = (60 / BSC_BLOCK_TIME) * 60 * 24 * 365; // 10512000
      const CAKE_PER_YEAR = CAKE_PER_BLOCK * BLOCKS_PER_YEAR;

      const yearlyCakeRewardAllocation = poolWeight * CAKE_PER_YEAR;

      return (
        ((yearlyCakeRewardAllocation * cakePriceUsd) / poolLiquidityUsd) * 100
      );
    } catch (error) {
      this.logger.error({ message: 'getFarmApr', error });
    }

    return apr;
  }

  async getFarmPools(data: {
    platform: PLATFORMS;
    web3: Web3;
  }): Promise<FarmPool[]> {
    const { platform, web3 } = data;

    const bnbBlockchain =
      await this.blockchainsService.getBnbBlockchainEntity();

    const venusTokens = await this.contractsService.getVenusTokens(
      bnbBlockchain.id,
    );

    const setVTokens = new Set<string>();

    for (const venusToken of venusTokens) {
      setVTokens.add(
        (venusToken.data as InnerTokenDto).baseContractAddress.toLowerCase(),
      );
    }

    let farmPools = await this.getAllFarmPools({
      blockchainId: bnbBlockchain.id,
      platform,
      web3,
    });

    farmPools = await this.filterFarmPoolsByName({ list: farmPools, web3 });

    farmPools = await this.filterFarmPoolsByVenusTokens({
      list: farmPools,
      setVTokens,
      web3,
    });

    await this.fillFarmPoolsReservesAndTotalSupply({ farmPools, web3 });

    const mapTokenAddressName = new Map<string, string>();

    for (const farmPool of farmPools) {
      mapTokenAddressName.set(farmPool.token1Address, null);
      mapTokenAddressName.set(farmPool.token2Address, null);
    }

    await this.fillTokenNames({ mapTokenAddressName, web3 });

    for (const item of farmPools) {
      item.token1Name = mapTokenAddressName.get(item.token1Address);
      item.token2Name = mapTokenAddressName.get(item.token2Address);
    }

    return farmPools;
  }

  farmPoolToFarm(farmPool: FarmPool): Farm {
    return {
      platform: farmPool.platform,
      pair: `${farmPool.token1Name}-${farmPool.token2Name}`,
      token1: farmPool.token1Name,
      token2: farmPool.token2Name,
      lpAddress: farmPool.contract.options.address,
      asset1Address: farmPool.token1Address,
      asset2Address: farmPool.token2Address,
      pid: farmPool.pid,
      isBorrowable: farmPool.isBorrowable,
    };
  }

  private async getAllFarmPools(data: {
    platform: PLATFORMS;
    blockchainId: number;
    web3: Web3;
  }): Promise<FarmPool[]> {
    const { platform, web3, blockchainId } = data;

    if (platform === PLATFORMS.PANCAKESWAP) {
      return this.pancakeEthService.getPoolsInfo(web3);
    }

    const abi = this.getMasterChefAbiByPlatform(platform);

    const contract = await this.contractsService.getContract({
      blockchainId,
      platform,
      type: CONTRACT_TYPES.MASTER,
    });

    const masterChefContract = new web3.eth.Contract(abi, contract.address);

    const poolLenght = await masterChefContract.methods.poolLength().call();

    const contractsCallContext: ContractCallContext[] = [];

    const poolInfoCalls: CallContext[] = [];

    const multicall = new Multicall({
      web3Instance: web3,
      tryAggregate: false,
    });

    for (let i = 1; i < poolLenght; i++) {
      poolInfoCalls.push({
        reference: i.toString(),
        methodName: 'poolInfo',
        methodParameters: [i],
      });
    }

    contractsCallContext.push({
      reference: 'poolsInfo',
      contractAddress: contract.address,
      abi,
      calls: poolInfoCalls,
    });

    try {
      const results = [];

      const contractsCallResults: ContractCallResults = await multicall.call(
        contractsCallContext,
      );

      const poolsInfoResults = contractsCallResults.results.poolsInfo;

      if (poolsInfoResults.callsReturnContext) {
        for (const poolsInfoItem of poolsInfoResults.callsReturnContext) {
          const { reference, returnValues: poolsInfoValue } = poolsInfoItem;

          const allocPoint = toBN(poolsInfoValue[1].hex);
          const lastRewardBlock = toBN(poolsInfoValue[2].hex);
          const accCakePerShare = toBN(poolsInfoValue[3].hex);

          const lpAddress = poolsInfoValue[0];

          if (allocPoint.gt(0)) {
            const lpContract = new web3.eth.Contract(LP_TOKEN, lpAddress);

            results.push({
              platform,
              // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
              pid: Number.parseInt(reference, 10),
              pool: {
                accCakePerShare,
                lastRewardBlock,
                allocPoint,
                isRegular: false,
              },
              contract: lpContract,
              reserve1: toBN(0),
              reserve2: toBN(0),
              totalSupply: toBN(0),
              isBorrowable: false,
            });
          }
        }
      }

      return results;
    } catch (error) {
      this.logger.error({
        message: 'getAllFarmPools',
        error,
        platform,
        blockchainId,
        masterChefAddress: contract.address,
      });

      throw new LogicException(ERROR_CODES.MULTICALL_RESULT_ERROR);
    }
  }

  private async getLpTokenAddresses(data: {
    platform: PLATFORMS;
    masterChef: Contract;
    poolsInfo: SwapPoolInfo[];
    web3: Web3;
  }): Promise<string[]> {
    const { platform, masterChef, poolsInfo, web3 } = data;

    if (platform !== PLATFORMS.PANCAKESWAP) {
      return poolsInfo.map(
        (pool) => (pool as BiSwapPoolInfo | ApeSwapPoolInfo).lpToken,
      );
    }

    const methods = [];

    for (let i = 0; i < poolsInfo.length; i++) {
      methods.push(masterChef.methods.lpToken(i + 1));
    }

    return this.web3Service.executeWeb3Batch(web3, methods);
  }

  private async filterFarmPoolsByName(data: {
    list: FarmPool[];
    web3: Web3;
  }): Promise<FarmPool[]> {
    const { list, web3 } = data;

    const methods = list.map((item) => item.contract.methods.name());

    const names = await this.web3Service.executeWeb3Batch(web3, methods);

    const farmPools: FarmPool[] = [];

    for (const [i, name] of names.entries()) {
      if (name.endsWith('LPs') && !name.toLowerCase().includes('stable')) {
        farmPools.push(list[i]);
      }
    }

    return farmPools;
  }

  private async filterFarmPoolsByVenusTokens(data: {
    list: FarmPool[];
    setVTokens: Set<string>;
    web3: Web3;
  }): Promise<FarmPool[]> {
    const { list, setVTokens, web3 } = data;

    const methods = [];

    for (const item of list) {
      methods.push(
        item.contract.methods.token0(),
        item.contract.methods.token1(),
      );
    }

    const tokensAddress = await this.web3Service.executeWeb3Batch(
      web3,
      methods,
    );

    const farmPools: FarmPool[] = [];

    for (const [i, item] of list.entries()) {
      const token1Address = tokensAddress[2 * i];
      const token2Address = tokensAddress[2 * i + 1];

      const isBorrowable =
        setVTokens.has(token1Address.toLowerCase()) &&
        setVTokens.has(token2Address.toLowerCase());

      if (isBorrowable || item.platform === PLATFORMS.BOLIDE) {
        farmPools.push({ ...item, token1Address, token2Address, isBorrowable });
      }
    }

    return farmPools;
  }

  private async fillFarmPoolsReservesAndTotalSupply(data: {
    farmPools: FarmPool[];
    web3: Web3;
  }) {
    const { web3, farmPools } = data;

    const methods = [];

    for (const farmPool of farmPools) {
      methods.push(
        farmPool.contract.methods.getReserves(),
        farmPool.contract.methods.totalSupply(),
      );
    }

    const info = await this.web3Service.executeWeb3Batch(web3, methods);

    for (const [i, farmPool] of farmPools.entries()) {
      farmPool.reserve1 = toBN(info[2 * i]._reserve0);
      farmPool.reserve2 = toBN(info[2 * i]._reserve1);

      farmPool.totalSupply = toBN(info[2 * i + 1]);
    }
  }

  private async fillTokenNames(data: {
    mapTokenAddressName: Map<string, string>;
    web3: Web3;
  }) {
    const { mapTokenAddressName, web3 } = data;

    const methods = [];

    for (const address of mapTokenAddressName.keys()) {
      const contract = new web3.eth.Contract(ERC_20.abi, address);
      methods.push(contract.methods.symbol());
    }

    const tokensNames = await this.web3Service.executeWeb3Batch(web3, methods);

    const keysArray = [...mapTokenAddressName.keys()];

    for (const [i, address] of keysArray.entries()) {
      const name = this.bnbUtilsService.prepareName(tokensNames[i]);
      mapTokenAddressName.set(address, name);
    }
  }

  private async createMasterChefContract(data: {
    platform: PLATFORMS;
    blockchainId: number;
    web3: Web3;
  }): Promise<Contract> {
    const { platform, blockchainId, web3 } = data;

    const contract = await this.contractsService.getContract({
      blockchainId,
      platform,
      type: CONTRACT_TYPES.MASTER,
    });

    if (!contract) {
      throw new LogicException(
        ERROR_CODES.NOT_FOUND_CONTRACT({
          blockchainId,
          platform,
          type: CONTRACT_TYPES.MASTER,
        }),
      );
    }

    const abi = this.getMasterChefAbiByPlatform(platform);

    return new web3.eth.Contract(abi, contract.address);
  }

  private getMasterChefAbiByPlatform(platform: PLATFORMS): AbiItem[] {
    switch (platform) {
      case PLATFORMS.APESWAP:
        return APESWAP_MASTER_CHEF;
      case PLATFORMS.BISWAP:
        return MASTER_CHEF_BISWAP;
      case PLATFORMS.PANCAKESWAP:
        return PANCAKE_MASTER_CHEF;
      case PLATFORMS.BOLIDE:
        return BOLIDE_MASTER_CHEF;
      default:
        throw new Error(`Urecognized swap platform: ${platform}`);
    }
  }
}
