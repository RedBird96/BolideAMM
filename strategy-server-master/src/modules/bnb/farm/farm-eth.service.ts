import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { Interface } from 'ethers/lib/utils';
import { PLATFORMS } from 'src/common/constants/platforms';
import type { PairAmountType } from 'src/common/interfaces/PairAmountType';
import {
  fromWeiToNum,
  fromWeiToStr,
  numWei,
  safeBN,
  toBN,
} from 'src/common/utils/big-number-utils';
import { BigNumber } from 'src/common/utils/BigNumber';
import { LP_TOKEN } from 'src/modules/bnb/bolide/lp-token';
import { CONTRACT_TYPES } from 'src/modules/contracts/constants/contract-types';
import { ContractsService } from 'src/modules/contracts/contracts.service';
import type { ContractDto } from 'src/modules/contracts/dto/ContractDto';
import type Web3 from 'web3';
import type { ContractSendMethod } from 'web3-eth-contract';

import { BnbUtilsService } from '../bnb-utils.service';
import { BnbWeb3Service } from '../bnb-web3.service';
import { ERC_20 } from '../bolide/erc-20';
import { LOGIC } from '../bolide/logic';
import type { Farm } from '../interfaces/farm.interface';
import type { FarmLpPriceInfo } from '../interfaces/farm-lp-price-info.interface';
import { MulticallViewService } from '../multicall/multicall-view.service';
import { TokenEthService } from '../token/token-eth.service';
import { UniswapEthService } from '../uniswap/uniswap-eth.service';
import type { FarmPool } from './farm-analytics.service';
import { FarmAnalyticService } from './farm-analytics.service';
import { MASTER_CHEF } from './master-chef';
import { abi as MASTER_CHEF_BISWAP } from './master-chef-biswap';

@Injectable()
export class FarmEthService {
  private readonly logger = new Logger(FarmEthService.name);

  constructor(
    private readonly web3Service: BnbWeb3Service,
    private readonly bnbUtilsService: BnbUtilsService,
    private readonly uniswapEthService: UniswapEthService,
    private readonly tokenEthService: TokenEthService,
    private readonly contractsService: ContractsService,
    @Inject(forwardRef(() => FarmAnalyticService))
    private readonly farmAnalyticService: FarmAnalyticService,
    private readonly multicallViewService: MulticallViewService,
  ) {}

  async getMasterchefContract(data: {
    platform: PLATFORMS;
    blockchainId: number;
    web3: Web3;
  }) {
    const { platform, blockchainId, web3 } = data;

    const masterChefAddress = await this.contractsService.getContractAddress({
      blockchainId,
      platform,
      type: CONTRACT_TYPES.MASTER,
    });

    return new web3.eth.Contract(MASTER_CHEF, masterChefAddress);
  }

  async calcSwapEarn(data: {
    farm: Farm;
    logicContract: ContractDto;
    storageContract: ContractDto;
    web3: Web3;
  }) {
    const { farm, logicContract, storageContract, web3 } = data;

    this.logger.debug({ message: 'executing calcSwapEarn', farm });

    const masterChefAddress = await this.contractsService.getContractAddress({
      blockchainId: storageContract.blockchainId,
      platform: farm.platform,
      type: CONTRACT_TYPES.MASTER,
    });

    let infoCall;

    if (farm.platform === PLATFORMS.BISWAP) {
      const farmContract = new web3.eth.Contract(
        MASTER_CHEF_BISWAP,
        masterChefAddress,
      );

      infoCall = await farmContract.methods
        .pendingBSW(farm.pid, logicContract.address)
        .call();
    } else {
      const farmContract = new web3.eth.Contract(
        MASTER_CHEF,
        masterChefAddress,
      );

      infoCall = await farmContract.methods
        .pendingCake(farm.pid, logicContract.address)
        .call();
    }

    const amount = toBN(infoCall);

    this.logger.debug({
      message: 'calcSwapEarn result',
      amount: fromWeiToStr(amount),
    });

    return amount;
  }

  // returns amount of staked lp tokens on farming
  async getStakedAmount(data: {
    farm: Farm;
    logicContract: ContractDto;
    storageContract: ContractDto;
    web3: Web3;
  }) {
    const { farm, logicContract, storageContract, web3 } = data;

    try {
      const masterChefAddress = await this.contractsService.getContractAddress({
        blockchainId: storageContract.blockchainId,
        platform: farm.platform,
        type: CONTRACT_TYPES.MASTER,
      });

      const farmContract = new web3.eth.Contract(
        MASTER_CHEF,
        masterChefAddress,
      );

      const infoCall = await farmContract.methods
        .userInfo(farm.pid, logicContract.address)
        .call();

      const amount = toBN(infoCall.amount);

      this.logger.debug({
        message: 'getStakedAmount',
        amount: fromWeiToStr(amount),
        farm: farm.pair,
      });

      return amount;
    } catch (error) {
      this.logger.warn({
        message: 'Error while executing getStakedAmount',
        farm,
        error,
      });

      throw error;
    }
  }

  // returns all farms with staked lp tokens
  async getLiquidityPoolFarms(data: {
    storageContract: ContractDto;
    logicContract: ContractDto;
    isDestructPairs: boolean;
  }): Promise<Farm[]> {
    const { logicContract, storageContract, isDestructPairs = false } = data;

    this.logger.debug({ message: 'executing getLiquidityPoolFarms' });
    const result = [];

    const farms = await this.contractsService.getFarms(
      storageContract.blockchainId,
      isDestructPairs,
    );

    const lpAddresses = [];
    const inputs = [];

    for (const farm of farms) {
      lpAddresses.push(farm.lpAddress);
      inputs.push([logicContract.address]);
    }

    const resultDataArr =
      await this.multicallViewService.useMultipleContractSingleData(
        lpAddresses,
        new Interface(ERC_20.abi as any),
        'balanceOf',
        inputs,
      );

    for (const [index, resultData] of resultDataArr.entries()) {
      if (!resultData[0].isZero()) {
        const farm = farms[index];

        const decimals = await this.bnbUtilsService.getDecimals(farm.lpAddress);

        this.logger.debug({
          message: 'getLiquidityPoolFarms > balance',
          token: farm.lpAddress,
          pair: farm.pair,
          owner: logicContract.address,
          result: fromWeiToStr(toBN(resultData[0].toString()), decimals),
        });

        result.push(farm);
      }
    }

    return result;
  }

  // returns all farms with staked lp tokens
  async getStakedFarms(data: {
    storageContract: ContractDto;
    logicContract: ContractDto;
    isDestructPairs?: boolean;
  }): Promise<Farm[]> {
    const { storageContract, logicContract, isDestructPairs = false } = data;

    this.logger.debug({ message: 'executing getStakedFarms' });
    const result = [];

    const farms = await this.contractsService.getFarms(
      storageContract.blockchainId,
      isDestructPairs,
    );

    const farmAddresses = [];
    const inputs = [];

    for (const farm of farms) {
      const masterChefAddress = await this.contractsService.getContractAddress({
        blockchainId: storageContract.blockchainId,
        platform: farm.platform,
        type: CONTRACT_TYPES.MASTER,
      });

      farmAddresses.push(masterChefAddress);
      inputs.push([farm.pid, logicContract.address]);
    }

    const resultDataArr =
      await this.multicallViewService.useMultipleContractSingleData(
        farmAddresses,
        new Interface(MASTER_CHEF as any),
        'userInfo',
        inputs,
      );

    for (const [index, resultData] of resultDataArr.entries()) {
      if (!resultData.amount.isZero()) {
        const farm = farms[index];

        this.logger.debug({
          message: 'getStakedFarms > pair',
          amount: fromWeiToStr(toBN(resultData.amount.toString())),
          farm: farm.pair,
        });

        result.push(farm);
      }
    }

    return result;
  }

  async getFarmPoolPriceInfo(data: {
    farmPool: FarmPool;
    mapTokenPrice?: Map<string, number>;
    web3: Web3;
  }): Promise<FarmLpPriceInfo> {
    const { farmPool, mapTokenPrice, web3 } = data;

    const farm = this.farmAnalyticService.farmPoolToFarm(farmPool);

    return this.calcFarmLpPriceInfo({
      farm,
      totalSupply: farmPool.totalSupply,
      reserve1: farmPool.reserve1,
      reserve2: farmPool.reserve2,
      mapTokenPrice,
      web3,
    });
  }

  async getFarmLpPriceInfo(data: {
    farm: Farm;
    mapTokenPrice?: Map<string, number>;
    web3: Web3;
  }): Promise<FarmLpPriceInfo> {
    const { farm, mapTokenPrice, web3 } = data;

    const p = await this.getTokensReserves({ farm, web3 });
    const totalSupply = await this.tokenEthService.getLpTokenTotalSupply({
      address: farm.lpAddress,
      web3,
    });

    return this.calcFarmLpPriceInfo({
      farm,
      totalSupply,
      reserve1: p.token0,
      reserve2: p.token1,
      mapTokenPrice,
      web3,
    });
  }

  async calcFarmLpPriceInfo(data: {
    farm: Farm;
    totalSupply: BigNumber;
    reserve1: BigNumber;
    reserve2: BigNumber;
    mapTokenPrice?: Map<string, number>;
    web3: Web3;
  }): Promise<FarmLpPriceInfo> {
    const result = {} as FarmLpPriceInfo;

    try {
      const { farm, totalSupply, reserve1, reserve2, mapTokenPrice, web3 } =
        data;

      const userLpPart = 1 / fromWeiToNum(totalSupply);
      const userToken1Amount = fromWeiToNum(reserve1) * userLpPart;
      const userToken2Amount = fromWeiToNum(reserve2) * userLpPart;

      let token1PriceUSD: number;

      if (mapTokenPrice && mapTokenPrice.has(farm.token1)) {
        token1PriceUSD = mapTokenPrice.get(farm.token1);
      } else {
        token1PriceUSD = fromWeiToNum(
          await this.uniswapEthService.getTokenPriceUSD({
            asset: farm.token1,
            platform: farm.platform,
            web3,
          }),
        );
        mapTokenPrice.set(farm.token1, token1PriceUSD);
      }

      let token2PriceUSD: number;

      if (mapTokenPrice && mapTokenPrice.has(farm.token2)) {
        token2PriceUSD = mapTokenPrice.get(farm.token2);
      } else {
        token2PriceUSD = fromWeiToNum(
          await this.uniswapEthService.getTokenPriceUSD({
            asset: farm.token2,
            platform: farm.platform,
            web3,
          }),
        );
        mapTokenPrice.set(farm.token2, token2PriceUSD);
      }

      result.token1 = farm.token1;
      result.token2 = farm.token2;
      result.platform = farm.platform;
      result.pair = farm.pair;
      result.lpAddress = farm.lpAddress;
      result.lpPrice =
        token1PriceUSD * userToken1Amount + token2PriceUSD * userToken2Amount;
      result.token1Liquidity = userToken1Amount;
      result.token1Price = token1PriceUSD;
      result.token2Liquidity = userToken2Amount;
      result.token2Price = token2PriceUSD;
      result.totalSupply = fromWeiToNum(totalSupply);
    } catch (error) {
      this.logger.error({ message: 'getFarmLpPriceInfo', error, data });
    }

    return result;
  }

  async getFarmsLiquidityLocked(data: {
    farm: Farm;
    storageContract: ContractDto;
    logicContract: ContractDto;
    web3: Web3;
  }) {
    const { farm, logicContract, storageContract, web3 } = data;

    this.logger.debug({ message: 'executing getFarmsLiquidityLocked', farm });

    const info = await this.getFarmLpPriceInfo({ farm, web3 });
    const farmContract = await this.getMasterchefContract({
      platform: farm.platform,
      blockchainId: storageContract.blockchainId,
      web3,
    });

    const userInfo = await farmContract.methods
      .userInfo(farm.pid, logicContract.address)
      .call();

    const userTokenAmount = toBN(userInfo.amount);

    return fromWeiToNum(userTokenAmount.mul(toBN(info.lpPrice)));
  }

  async getTokensReserves(data: { farm: Farm; web3: Web3 }) {
    const { farm, web3 } = data;

    this.logger.debug({
      message: 'executing getTokensReserves',
      pair: farm.pair,
    });

    const contract = new web3.eth.Contract(LP_TOKEN, farm.lpAddress);
    const reserves = await contract.methods.getReserves().call();

    const result = {
      token0: toBN(reserves._reserve0),
      token0Decimals: await this.bnbUtilsService.getDecimals(
        farm.asset1Address,
      ),
      token1: toBN(reserves._reserve1),
      token1Decimals: await this.bnbUtilsService.getDecimals(
        farm.asset2Address,
      ),
    };

    this.logger.debug({ message: 'getTokensReserves result', result });

    return result;
  }

  // adds liquidity pair on market
  async addLiquidity(data: {
    farm: Farm;
    pairAmounts: PairAmountType;
    uid: string;
    storageContract: ContractDto;
    logicContract: ContractDto;
    web3: Web3;
    isTransactionProdMode: boolean;
  }): Promise<{ tx: ContractSendMethod; meta: Record<string, unknown> }> {
    const {
      farm,
      pairAmounts,
      uid,
      storageContract,
      logicContract,
      web3,
      isTransactionProdMode,
    } = data;

    this.logger.debug({
      message: 'executing addLiquidity',
      farm,
      token1Amount: fromWeiToStr(pairAmounts.token1Amount),
      token2Amount: fromWeiToStr(pairAmounts.token2Amount),
      uid,
    });

    const routerAddress = await this.contractsService.getContractAddress({
      blockchainId: storageContract.blockchainId,
      platform: farm.platform,
      type: CONTRACT_TYPES.ROUTER,
    });

    let amount1 = pairAmounts.token1Amount;
    let amount2 = pairAmounts.token2Amount;

    const { amount: amount1Available } =
      await this.tokenEthService.getTokenAvailableAmount({
        tokenAddress: farm.asset1Address,
        walletAddress: logicContract.address,
        storageContract,
        web3,
      });

    const { amount: amount2Available } =
      await this.tokenEthService.getTokenAvailableAmount({
        tokenAddress: farm.asset2Address,
        walletAddress: logicContract.address,
        storageContract,
        web3,
      });

    amount1 = BigNumber.min(amount1, amount1Available);
    amount2 = BigNumber.min(amount2, amount2Available);

    const now = Math.floor(Date.now() / 1000);
    const deadline = now + 900;

    this.logger.debug({
      message: 'addLiquidity after calcs',
      routerAddress,
      asset2Address: farm.asset2Address,
      amount2: amount2.toString(10),
      amount1: amount1.toString(10),
      value1: 0,
      value2: 0,
      deadline,
      isTransactionProdMode,
    });

    const web3LogicContract = new web3.eth.Contract(
      LOGIC.abi,
      logicContract.address,
    );

    if (farm.token1 === 'BNB' || farm.token2 === 'BNB') {
      if (farm.token1 === 'BNB') {
        const tx = web3LogicContract.methods.addLiquidityETH(
          routerAddress,
          farm.asset2Address,
          safeBN(amount2),
          safeBN(amount1),
          '0',
          '0',
          deadline,
        );

        const meta = {
          swap: routerAddress,
          token: farm.asset2Address,
          amountTokenDesired: amount2.toString(),
          amountETHDesired: amount1.toString(),
          amountTokenMin: '0',
          amountETHMin: '0',
          deadline,
        };

        return { tx, meta };
      }

      const tx = web3LogicContract.methods.addLiquidityETH(
        routerAddress,
        farm.asset1Address,
        safeBN(amount1),
        safeBN(amount2),
        '0',
        '0',
        deadline,
      );

      const meta = {
        swap: routerAddress,
        token: farm.asset1Address,
        amountTokenDesired: amount1.toString(10),
        amountETHDesired: amount2.toString(10),
        amountTokenMin: '0',
        amountETHMin: '0',
        deadline,
      };

      return { tx, meta };
    }

    const tx = web3LogicContract.methods.addLiquidity(
      routerAddress,
      farm.asset1Address,
      farm.asset2Address,
      safeBN(amount1),
      safeBN(amount2),
      '0',
      '0',
      deadline,
    );

    const meta = {
      swap: routerAddress,
      tokenA: farm.asset1Address,
      tokenB: farm.asset2Address,
      amountADesired: amount1.toString(10),
      amountBDesired: amount2.toString(10),
      amountAMin: '0',
      amountBMin: '0',
      deadline,
    };

    return { tx, meta };
  }

  // calculates amount of lp tokens and remove lp token from Swap market
  async removeLiquidity(data: {
    farm: Farm;
    uid: string;
    storageContract: ContractDto;
    logicContract: ContractDto;
    web3: Web3;
    isTransactionProdMode: boolean;
  }): Promise<
    { tx: ContractSendMethod; meta: Record<string, unknown> } | undefined
  > {
    const {
      farm,
      uid,
      storageContract,
      logicContract,
      web3,
      isTransactionProdMode,
    } = data;

    this.logger.debug({
      message: 'executing removeLiquidity',
      uid,
      isTransactionProdMode,
      storageContract: storageContract.address,
      logicContract: logicContract.address,
    });

    const { amount } = await this.tokenEthService.getTokenAvailableAmount({
      tokenAddress: farm.lpAddress,
      walletAddress: logicContract.address,
      storageContract,
      web3,
    });

    if (amount.gt(toBN(0))) {
      const now = Math.floor(Date.now() / 1000);
      const deadline = now + 900;

      const routerAddress = await this.contractsService.getContractAddress({
        blockchainId: storageContract.blockchainId,
        platform: farm.platform,
        type: CONTRACT_TYPES.ROUTER,
      });

      const web3LogicContract = new web3.eth.Contract(
        LOGIC.abi,
        logicContract.address,
      );

      if (farm.token1 === 'BNB' || farm.token2 === 'BNB') {
        if (farm.token1 === 'BNB') {
          const tx = web3LogicContract.methods.removeLiquidityETH(
            routerAddress,
            farm.asset2Address,
            safeBN(amount),
            '0',
            '0',
            deadline,
          );

          const meta = {
            swap: routerAddress,
            token: farm.asset2Address,
            liquidity: amount.toString(),
            amountTokenMin: '0',
            amountETHMin: '0',
            deadline,
          };

          return { tx, meta };
        }

        const tx = web3LogicContract.methods.removeLiquidityETH(
          routerAddress,
          farm.asset1Address,
          safeBN(amount),
          '0',
          '0',
          deadline,
        );

        const meta = {
          swap: routerAddress,
          token: farm.asset1Address,
          liquidity: amount.toString(),
          amountTokenMin: '0',
          amountETHMin: '0',
          deadline,
        };

        return { tx, meta };
      }

      const tx = web3LogicContract.methods.removeLiquidity(
        routerAddress,
        farm.asset1Address,
        farm.asset2Address,
        safeBN(amount),
        '0',
        '0',
        deadline,
      );

      const meta = {
        swap: routerAddress,
        tokenA: farm.asset1Address,
        tokenB: farm.asset2Address,
        liquidity: amount.toString(),
        amountAMin: '0',
        amountBMin: '0',
        deadline,
      };

      return { tx, meta };
    }
  }

  public async getLpContract(data: { tokenAddress: string; web3: Web3 }) {
    const { tokenAddress, web3 } = data;

    const contract = new web3.eth.Contract(LP_TOKEN, tokenAddress);
    const reserves = await contract.methods.getReserves().call();
    const totalSupply: string = await contract.methods.totalSupply().call();

    const token0: string = await contract.methods.token0().call();
    const token1: string = await contract.methods.token1().call();

    return {
      contract,
      reserve0: numWei(reserves._reserve0),
      reserve1: numWei(reserves._reserve1),
      totalSupply: numWei(totalSupply),
      token0: token0.toLowerCase(),
      token1: token1.toLowerCase(),
    };
  }
}
