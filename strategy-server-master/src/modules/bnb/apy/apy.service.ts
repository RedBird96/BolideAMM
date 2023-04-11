import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { groupBy } from 'lodash';
import { DateTime } from 'luxon';
import type Web3 from 'web3';

import { PLATFORMS } from '../../../common/constants/platforms';
import type { STRATEGY_TYPES } from '../../../common/constants/strategy-types';
import { numWei } from '../../../common/utils/big-number-utils';
import { UtilsService } from '../../../providers/utils.service';
import { BlockchainsService } from '../../blockchains/blockchains.service';
import { CONTRACT_TYPES } from '../../contracts/constants/contract-types';
import { TOKEN_NAMES } from '../../contracts/constants/token-names';
import { ContractsService } from '../../contracts/contracts.service';
import type { HistoryOptionsDto } from '../../external-api/dto/HistoryOptions';
import type { LandBorrowFarmSettingsDto } from '../../land-borrow-farm-strategy/dto/LandBorrowFarmSettingsDto';
import type { StrategyDto } from '../../strategies/dto/StrategyDto';
import { StrategiesService } from '../../strategies/strategies.service';
import { TheGraphService } from '../../thegraph/thegraph.service';
import { ERC_20 } from '../bolide/erc-20';
import { BOLIDE_MASTER_CHEF } from '../bolide/master-chef-bolide';
import { STORAGE } from '../bolide/storage';
import { FarmEthService } from '../farm/farm-eth.service';
import { UniswapApiService } from '../uniswap/uniswap-api.serivce';
import { ApyHistoryRepository } from './apy-history.repository';
import type { ApyDto } from './dto/ApyDto';
import type { ApyHistoryDto } from './dto/ApyHistoryDto';
import type { ApyHistoryStrategyDataDto } from './dto/ApyHistoryStrategyDataDto';

export enum PID {
  STAKING_BLID,
  FAMING_BLID_USDT,
}

@Injectable()
export class ApyService {
  private readonly logger = new Logger(ApyService.name);

  constructor(
    private readonly uniswapApiService: UniswapApiService,
    private readonly blockchainsService: BlockchainsService,
    private readonly contractsService: ContractsService,
    private readonly strategiesService: StrategiesService,
    private readonly farmEthService: FarmEthService,
    private readonly theGraphService: TheGraphService,
    private readonly apyHistoryRepository: ApyHistoryRepository,
  ) {}

  async getApyData(web3: Web3): Promise<ApyDto> {
    const strategies = await this.strategiesService.getAllStrategies();
    const { farmingApy, stakingApy, mapStrategyApy } = await this.calcApyData({
      web3,
      strategies,
    });

    const strategiesApy: Array<{
      id: number;
      type: STRATEGY_TYPES;
      name: string;
      apy: number;
    }> = [];

    for (const [strategy, apy] of mapStrategyApy.entries()) {
      strategiesApy.push({
        id: strategy.id,
        type: strategy.type,
        name: strategy.name,
        apy,
      });
    }

    return {
      farmingApy,
      stakingApy,
      strategiesApy,
    };
  }

  async fillApyHistory(web3: Web3): Promise<void> {
    const date = new Date();

    const strategies = await this.strategiesService.getAllStrategies();
    const filteredStrategies = strategies.filter(
      (strategy) => strategy.settings.isSaveApyHistoryEnabled,
    );

    const { farmingApy, stakingApy, mapStrategyApy } = await this.calcApyData({
      strategies: filteredStrategies,
      web3,
    });

    const strategiesApyData: ApyHistoryStrategyDataDto[] = [];

    for (const [strategy, strategyApy] of mapStrategyApy.entries()) {
      const storageContract = await this.contractsService.getContractById(
        strategy.storageContractId,
      );

      strategiesApyData.push({
        strategyId: strategy.id,
        contractAddress: storageContract.address,
        strategyApy,
      });
    }

    const bnbBlockchain = await this.blockchainsService.getBnbBlockchain();

    await this.apyHistoryRepository.save({
      date,
      blockchainId: bnbBlockchain.id,
      farmingApy: bnbBlockchain.settings.isSaveFarmingHistoryEnabled
        ? farmingApy
        : null,
      stakingApy: bnbBlockchain.settings.isSaveStakingHistoryEnabled
        ? stakingApy
        : null,
      strategiesApyData,
    });
  }

  private async calcApyData(data: {
    strategies: StrategyDto[];
    web3: Web3;
  }): Promise<{
    mapStrategyApy: Map<StrategyDto, number>;
    farmingApy: number;
    stakingApy: number;
  }> {
    const { strategies, web3 } = data;

    const { token1Price } = await this.uniswapApiService.getUsdtBlidPoolData();

    const blidPriceUsd = Number(token1Price);

    const farmingApy = await this.getApyFromFarming({ blidPriceUsd, web3 });
    const stakingApy = await this.getApyFromStaking({ blidPriceUsd, web3 });

    const mapStrategyApy = new Map<StrategyDto, number>();

    for (const strategy of strategies) {
      const strategyApy = await this.getStrategyApy({
        strategy,
        blidPriceUsd,
        web3,
      });
      mapStrategyApy.set(strategy, strategyApy);
    }

    return {
      mapStrategyApy,
      farmingApy,
      stakingApy,
    };
  }

  async getStrategyApy(data: {
    strategy: StrategyDto;
    blidPriceUsd: number;
    web3: Web3;
  }): Promise<number> {
    const { strategy, blidPriceUsd, web3 } = data;

    let apy = 0;

    try {
      const earns = await this.getEarns({ strategy, web3 });
      apy = this.calcApy(earns, blidPriceUsd);
    } catch (error) {
      this.logger.error({
        error,
        message: 'getStrategyApy error',
        data: {
          strategyId: strategy.id,
          blidPriceUsd,
        },
      });

      apy = 0;
    }

    return apy;
  }

  private async getEarns(data: {
    strategy: StrategyDto;
    web3: Web3;
  }): Promise<any> {
    const { strategy, web3 } = data;
    const { storageContractId, settings } = strategy;
    const { theGraphApiUrl } = settings as LandBorrowFarmSettingsDto;

    let { addEarnEntities: earns = [] } =
      await this.theGraphService.getDepositsAndEarnInfo(theGraphApiUrl);

    const storageContract = await this.contractsService.getContractById(
      storageContractId,
    );

    const contract = new web3.eth.Contract(
      STORAGE.abi,
      storageContract.address,
    );

    let lastEarn = null;
    const countEarns = Number(await contract.methods.getCountEarns().call());

    if (countEarns !== 0) {
      lastEarn = await contract.methods.getEarnsByID(countEarns - 1).call();
    }

    if (
      earns.length > 1 &&
      lastEarn &&
      lastEarn[1] > earns[earns.length - 1].timestamp
    ) {
      earns.push({
        amount: lastEarn[0],
        timestamp: lastEarn[1],
        usd: lastEarn[2],
      });
    }

    if (earns.length > 6) {
      earns = earns.slice(-6);
    }

    return earns;
  }

  private calcApy(earns: any, blidPriceUsd: number): number {
    earns = earns.slice(-6);

    const lastIndex = earns.length - 1;

    const firstDateTime = DateTime.fromSeconds(
      Number.parseInt(earns[0].timestamp, 10),
    );
    const lastDateTime = DateTime.fromSeconds(
      Number.parseInt(earns[lastIndex].timestamp, 10),
    );

    const diff = lastDateTime.diff(firstDateTime, ['days']);
    const periodInDays = diff.toObject().days;

    if (!periodInDays) {
      return 0;
    }

    let totalInBlid = 0;
    let totalDepositenInUsd = 0;

    for (const earn of earns) {
      totalInBlid += Number(earn.amount);
      totalDepositenInUsd += Number(earn.usd);
    }

    const avgDeposited = totalDepositenInUsd / earns.length;

    const avgPercent = (totalInBlid * blidPriceUsd) / avgDeposited;

    const avgPercentPerDay = avgPercent / periodInDays;

    return (Math.pow(1 + avgPercentPerDay, 365) - 1) * 100;
  }

  async getApyFromStaking(data: {
    blidPriceUsd: number;
    web3: Web3;
  }): Promise<number> {
    const { blidPriceUsd, web3 } = data;

    const blidTokenAddress = await this.getBlidTokenAddress();

    return this.getApyForStakingAndFarming({
      pid: PID.STAKING_BLID,
      tokenAddress: blidTokenAddress,
      blidPriceUsd,
      tokenPrice: blidPriceUsd,
      web3,
    });
  }

  async getApyFromFarming(data: {
    blidPriceUsd: number;
    web3: Web3;
  }): Promise<number> {
    const { blidPriceUsd, web3 } = data;

    try {
      const tokenPrice = await this.getFarmPrice({ blidPriceUsd, web3 });
      const blidUsdtTokenAddress = await this.getBlidUsdtLpTokenAddress();

      return this.getApyForStakingAndFarming({
        pid: PID.FAMING_BLID_USDT,
        tokenAddress: blidUsdtTokenAddress,
        blidPriceUsd,
        tokenPrice,
        web3,
      });
    } catch (error) {
      this.logger.error({
        e: error,
        message: 'Error in getApyFromFarming',
        data: {
          blidPriceUsd,
        },
      });

      return 0;
    }
  }

  async getFarmPrice(data: {
    blidPriceUsd: number;
    web3: Web3;
  }): Promise<number> {
    const { blidPriceUsd, web3 } = data;

    const blidTokenAddress = await this.getBlidTokenAddress();
    const blidUsdtTokenAddress = await this.getBlidUsdtLpTokenAddress();

    const { reserve0, reserve1, totalSupply, token0, token1 } =
      await this.farmEthService.getLpContract({
        tokenAddress: blidUsdtTokenAddress,
        web3,
      });

    const userLpPart = 1 / totalSupply;
    const userToken0Amount = reserve0 * userLpPart;
    const userToken1Amount = reserve1 * userLpPart;

    if (token0 === blidTokenAddress) {
      return userToken0Amount * blidPriceUsd * 2;
    } else if (token1 === blidTokenAddress) {
      return userToken1Amount * blidPriceUsd * 2;
    }

    this.logger.debug({
      message: 'Unknown tokens in getFarmPrice',
      data: {
        blidPriceUsd,
        blidTokenAddress,
        blidUsdtTokenAddress,
        token0,
        token1,
      },
    });

    return 0;
  }

  async getApyForStakingAndFarming(data: {
    pid: PID;
    tokenAddress: string;
    blidPriceUsd: number;
    tokenPrice: number;
    web3: Web3;
  }): Promise<number> {
    const { pid, tokenAddress, web3, blidPriceUsd, tokenPrice } = data;

    const bnbBlockchain = await this.blockchainsService.getBnbBlockchain();

    const masterChefAddress = await this.contractsService.getContractAddress({
      blockchainId: bnbBlockchain.id,
      platform: PLATFORMS.BOLIDE,
      type: CONTRACT_TYPES.MASTER,
    });

    const farmContract = new web3.eth.Contract(
      BOLIDE_MASTER_CHEF,
      masterChefAddress,
    );

    const erc20 = new web3.eth.Contract(ERC_20.abi, tokenAddress);

    if (!blidPriceUsd || !masterChefAddress || !farmContract) {
      this.logger.debug({
        message: 'Empty vars in getApyForStakingAndFarming',
        data: {
          blidPriceUsd,
          masterChefAddress,
        },
      });

      return 0;
    }

    try {
      const infoCall: any = await farmContract.methods.poolInfo(pid).call();
      const totalAllocPoint: string = await farmContract.methods
        .totalAllocPoint()
        .call();
      const blidPerBlock: string = await farmContract.methods
        .blidPerBlock()
        .call();

      const farmAllocPoint: string = infoCall.allocPoint;

      const balanceOfMaster: string = await erc20.methods
        .balanceOf(masterChefAddress)
        .call();

      const poolLiquidityUsd: number = numWei(balanceOfMaster) * tokenPrice;
      const poolWeight: number =
        Number(farmAllocPoint) / Number(totalAllocPoint);

      const { apy } = this.getFarmApyApr(
        poolWeight,
        blidPriceUsd,
        poolLiquidityUsd,
        numWei(blidPerBlock),
      );

      return apy;
    } catch (error) {
      this.logger.error({
        e: error,
        message: 'Error in getApyForStakingAndFarming',
        data: {
          pid,
          tokenAddress,
          blidPriceUsd,
          tokenPrice,
        },
      });

      return 0;
    }
  }

  getFarmApyApr(
    poolWeight: number,
    cakePriceUsd: number,
    poolLiquidityUsd: number,
    cakePerBlockInfo: number,
  ) {
    const BSC_BLOCK_TIME = 3;
    const CAKE_PER_BLOCK = cakePerBlockInfo;
    const BLOCKS_PER_YEAR = (60 / BSC_BLOCK_TIME) * 60 * 24 * 365;
    const CAKE_PER_YEAR = CAKE_PER_BLOCK * BLOCKS_PER_YEAR;
    const BLOCKS_PER_DAY = (60 / BSC_BLOCK_TIME) * 60 * 24;
    const CAKE_PER_DAY = CAKE_PER_BLOCK * BLOCKS_PER_DAY;

    const yearlyCakeRewardAllocation = poolWeight * CAKE_PER_YEAR;
    const dayCakeRewardAllocation = poolWeight * CAKE_PER_DAY;
    const APR =
      ((yearlyCakeRewardAllocation * cakePriceUsd) / poolLiquidityUsd) * 100;
    const APY =
      (Math.pow(
        (dayCakeRewardAllocation * cakePriceUsd) / poolLiquidityUsd + 1,
        365,
      ) -
        1) *
      100;

    return {
      apy: Number.isFinite(APY) ? APY : 0,
      apr: Number.isFinite(APR) ? APR : 0,
    };
  }

  async getBlidTokenAddress(): Promise<string> {
    const bnbBlockchain = await this.blockchainsService.getBnbBlockchain();

    const blidToken = await this.contractsService.getTokenByName(
      bnbBlockchain.id,
      TOKEN_NAMES.BLID,
    );

    return blidToken?.address?.toLowerCase();
  }

  async getBlidUsdtLpTokenAddress(): Promise<string> {
    const bnbBlockchain = await this.blockchainsService.getBnbBlockchain();

    const usdtBlidToken = await this.contractsService.getUsdtBlidLpContract(
      bnbBlockchain.id,
    );

    return usdtBlidToken?.address?.toLowerCase();
  }

  async getApyHistoryData(
    options: HistoryOptionsDto,
  ): Promise<ApyHistoryDto[]> {
    const entities = await this.apyHistoryRepository.find({});

    if (options.period === 'days') {
      return entities.map((entity) => entity.toDto());
    } else if (options.period === 'weeks' || options.period === 'months') {
      return this.getAverageApyHistory(options, entities);
    }

    throw new BadRequestException('Unknown period');
  }

  protected async getAverageApyHistory(
    options: HistoryOptionsDto,
    entities: ApyHistoryDto[],
  ): Promise<ApyHistoryDto[]> {
    const averageItems: ApyHistoryDto[] = [];

    const groups = groupBy(entities, ({ date }) =>
      UtilsService.getKeyByPeriod(date, options.period),
    );

    for (const key of Object.keys(groups)) {
      const groupData: ApyHistoryDto = groups[key][0];

      for (let i = 1; i < groups[key].length; i++) {
        const current = groups[key][i];
        groupData.farmingApy = groupData.farmingApy + current.farmingApy;
        groupData.stakingApy = groupData.farmingApy + current.stakingApy;
        groupData.strategiesApyData = groupData.strategiesApyData.map(
          (data) => {
            const curData = current.strategiesApyData.find(
              (value) => data.strategyId === value.strategyId,
            );

            return {
              ...data,
              strategyApy: data.strategyApy + (curData?.strategyApy || 0),
            };
          },
        );
      }

      averageItems.push(groupData);
    }

    return averageItems;
  }
}
