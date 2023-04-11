import { Injectable, Logger } from '@nestjs/common';
import type {
  ContractCallContext,
  ContractCallResults,
} from 'ethereum-multicall';
import { Multicall } from 'ethereum-multicall';
import type { CallContext } from 'ethereum-multicall/dist/esm/models';
import { ERROR_CODES } from 'src/common/constants/error-codes';
import { PLATFORMS } from 'src/common/constants/platforms';
import { LogicException } from 'src/common/logic.exception';
import { toBN } from 'src/common/utils/big-number-utils';
import { BigNumber } from 'src/common/utils/BigNumber';
import { BlockchainsService } from 'src/modules/blockchains/blockchains.service';
import { CONTRACT_TYPES } from 'src/modules/contracts/constants/contract-types';
import { ContractsService } from 'src/modules/contracts/contracts.service';
import type Web3 from 'web3';
import type { Contract } from 'web3-eth-contract';

import { LP_TOKEN } from '../bolide/lp-token';
import type { FarmPool, PancakePoolInfo } from '../farm/farm-analytics.service';
import type { Farm } from '../interfaces/farm.interface';
import type { FarmLpPriceInfo } from '../interfaces/farm-lp-price-info.interface';
import type { FarmRewardsInfo } from '../interfaces/farm-rewards-info.iterface';
import { PANCAKE_MASTER_CHEF } from './master-chef';

export const BSC_BLOCK_TIME = 3;

export const BLOCKS_PER_YEAR = (60 / BSC_BLOCK_TIME) * 60 * 24 * 365; // 10512000

export const FARMING_CAKE_PER_BLOCK = 2.513_888_888_88;

export interface PancakeFarm extends Farm {
  isRegular: boolean;
}

@Injectable()
export class PancakeEthService {
  private readonly logger = new Logger(PancakeEthService.name);

  mullticallContract: Contract;

  constructor(
    private readonly contractsService: ContractsService,
    private readonly blockchainsService: BlockchainsService,
  ) {}

  async getMasterCheafContract(data: { blockchainId: number; web3: Web3 }) {
    const { blockchainId, web3 } = data;

    const pancakeMasterChef = await this.contractsService.getContract({
      blockchainId,
      platform: PLATFORMS.PANCAKESWAP,
      type: CONTRACT_TYPES.MASTER,
    });

    return new web3.eth.Contract(
      PANCAKE_MASTER_CHEF,
      pancakeMasterChef.address,
    );
  }

  async getPoolsInfo(web3: Web3): Promise<FarmPool[]> {
    const bnbBlockchain = await this.blockchainsService.getBnbBlockchain();
    const { id: blockchainId } = bnbBlockchain;

    const contract = await this.contractsService.getContract({
      blockchainId,
      platform: PLATFORMS.PANCAKESWAP,
      type: CONTRACT_TYPES.MASTER,
    });

    const masterChefContract = new web3.eth.Contract(
      PANCAKE_MASTER_CHEF,
      contract.address,
    );

    const poolLenght = await masterChefContract.methods.poolLength().call();

    const contractsCallContext: ContractCallContext[] = [];

    const poolInfoCalls: CallContext[] = [];
    const lpTokenCalls: CallContext[] = [];

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

      lpTokenCalls.push({
        reference: i.toString(),
        methodName: 'lpToken',
        methodParameters: [i],
      });
    }

    contractsCallContext.push(
      {
        reference: 'poolsInfo',
        contractAddress: contract.address,
        abi: PANCAKE_MASTER_CHEF,
        calls: poolInfoCalls,
      },
      {
        reference: 'lpTokens',
        contractAddress: contract.address,
        abi: PANCAKE_MASTER_CHEF,
        calls: lpTokenCalls,
      },
    );

    try {
      const results = [];

      const contractsCallResults: ContractCallResults = await multicall.call(
        contractsCallContext,
      );

      const poolsInfoResults = contractsCallResults.results.poolsInfo;
      const lpTokensResults = contractsCallResults.results.lpTokens;

      if (
        poolsInfoResults.callsReturnContext &&
        lpTokensResults.callsReturnContext
      ) {
        for (let i = 0; i < poolsInfoResults.callsReturnContext.length; i++) {
          const poolsInfoItem = poolsInfoResults.callsReturnContext[i];
          const lpTokensItem = lpTokensResults.callsReturnContext[i];

          const { reference, returnValues: poolsInfoValue } = poolsInfoItem;
          const { returnValues: lpTokensValue } = lpTokensItem;

          const accCakePerShare = toBN(poolsInfoValue[0].hex);
          const lastRewardBlock = toBN(poolsInfoValue[1].hex);
          const allocPoint = toBN(poolsInfoValue[2].hex);
          const totalBoostedShare = toBN(poolsInfoValue[3].hex);
          const isRegular = poolsInfoValue[4];

          const lpAddress = lpTokensValue[0];

          if (allocPoint.gt(0)) {
            const lpContract = new web3.eth.Contract(LP_TOKEN, lpAddress);

            results.push({
              platform: PLATFORMS.PANCAKESWAP,
              // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
              pid: Number.parseInt(reference, 10),
              pool: {
                accCakePerShare,
                lastRewardBlock,
                allocPoint,
                totalBoostedShare,
                isRegular,
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
        message: 'getPoolsInfo',
        error,
        platform: PLATFORMS.PANCAKESWAP,
        blockchainId,
        masterChefAddress: contract.address,
      });

      throw new LogicException(ERROR_CODES.MULTICALL_RESULT_ERROR);
    }
  }

  async getTotalAllocPoint(web3: Web3): Promise<{
    totalRegularAllocPoint: number;
    totalSpecialAllocPoint: number;
  }> {
    try {
      const bnbBlockchain =
        await this.blockchainsService.getBnbBlockchainEntity();

      const masterChefContract = await this.getMasterCheafContract({
        web3,
        blockchainId: bnbBlockchain.id,
      });

      const totalRegularAllocPoint = await masterChefContract.methods
        .totalRegularAllocPoint()
        .call();
      const totalSpecialAllocPoint = await masterChefContract.methods
        .totalSpecialAllocPoint()
        .call();

      return {
        totalRegularAllocPoint,
        totalSpecialAllocPoint,
      };
    } catch (error) {
      this.logger.error('getTotalAllocPoint', error);
    }
  }

  async getFarmRewardsInfo(data: {
    farmPool: FarmPool;
    lpInfo: FarmLpPriceInfo;
    rewardTokenPrice: number;
    totalRegularAllocPoint: number;
    totalSpecialAllocPoint: number;
  }): Promise<FarmRewardsInfo> {
    try {
      const {
        farmPool,
        lpInfo,
        rewardTokenPrice,
        totalRegularAllocPoint,
        totalSpecialAllocPoint,
      } = data;

      const isRegular = (farmPool.pool as PancakePoolInfo).isRegular;
      const totalAllocPoint = isRegular
        ? totalRegularAllocPoint
        : totalSpecialAllocPoint;

      const farmAllocPoint = farmPool.pool.allocPoint;

      const poolLiquidityUsd = lpInfo.totalSupply * lpInfo.lpPrice;
      const poolWeight = farmAllocPoint / totalAllocPoint;

      const apr = this.getFarmApr(
        toBN(poolWeight),
        toBN(rewardTokenPrice),
        toBN(poolLiquidityUsd),
      );

      return {
        apr,
        poolLiquidityUsd,
        poolWeight,
      };
    } catch (error) {
      this.logger.error({
        message: 'getFarmRewardsInfo error',
        error,
        ...data,
      });
    }
  }

  getFarmApr(
    poolWeight: BigNumber,
    cakePriceUsd: BigNumber,
    poolLiquidityUsd: BigNumber,
  ): number {
    const yearlyCakeRewardAllocation = poolWeight
      ? poolWeight.times(BLOCKS_PER_YEAR * FARMING_CAKE_PER_BLOCK)
      : new BigNumber(Number.NaN);

    const cakeRewardsApr = yearlyCakeRewardAllocation
      .times(cakePriceUsd)
      .div(poolLiquidityUsd)
      .times(100);

    let cakeRewardsAprAsNumber = 0;

    if (!cakeRewardsApr.isNaN() && cakeRewardsApr.isFinite()) {
      cakeRewardsAprAsNumber = cakeRewardsApr.toNumber();
    }

    return cakeRewardsAprAsNumber;
  }
}
