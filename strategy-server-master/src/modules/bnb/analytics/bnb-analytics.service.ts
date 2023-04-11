import { Injectable, Logger } from '@nestjs/common';
import Decimal from 'decimal.js';
import { RollbarLogger } from 'nestjs-rollbar';
import { BLOCKCHAIN_NAMES } from 'src/common/constants/blockchain-names';
import { ERROR_CODES } from 'src/common/constants/error-codes';
import { PLATFORMS } from 'src/common/constants/platforms';
import { TG_MESSAGES } from 'src/common/constants/tg-messages';
import { LogicException } from 'src/common/logic.exception';
import { fromWeiToNum } from 'src/common/utils/big-number-utils';
import { BlockchainsService } from 'src/modules/blockchains/blockchains.service';
import { CONTRACT_TYPES } from 'src/modules/contracts/constants/contract-types';
import { TOKEN_NAMES } from 'src/modules/contracts/constants/token-names';
import { ContractsService } from 'src/modules/contracts/contracts.service';
import type { LandBorrowFarmSettingsDto } from 'src/modules/land-borrow-farm-strategy/dto/LandBorrowFarmSettingsDto';
import type { StrategyDto } from 'src/modules/strategies/dto/StrategyDto';
import { StrategiesService } from 'src/modules/strategies/strategies.service';
import { SwapPathsService } from 'src/modules/swap-paths/swap-paths.service';
import { TelegramService } from 'src/modules/telegram/telegram.service';
import type Web3 from 'web3';

import type { FarmPool } from '../farm/farm-analytics.service';
import { FarmAnalyticService } from '../farm/farm-analytics.service';
import { FarmEthService } from '../farm/farm-eth.service';
import type { Farm } from '../interfaces/farm.interface';
import type { FarmLpPriceInfo } from '../interfaces/farm-lp-price-info.interface';
import type { FarmRewardsInfo } from '../interfaces/farm-rewards-info.iterface';
import { PancakeEthService } from '../pancake/pancake-eth.service';
import { UniswapEthService } from '../uniswap/uniswap-eth.service';
import type { VenusTokenInfo } from '../venus/venus-token-info.interface';
import { VenusTokensInfoService } from '../venus/venus-tokens-info.service';
import { ApyStatsRepository } from './apy-stats.repository';
import { FarmStatsRepository } from './farm-stats.repository';
import { LendingStatsRepository } from './lending-stats.repository';

export interface FarmAnalyticItem {
  farm: Farm;
  farmLp: FarmLpPriceInfo;
  rewardInfo: FarmRewardsInfo;
}

export interface FarmsAnalytic {
  pancake: FarmAnalyticItem[];
  apeswap: FarmAnalyticItem[];
  biswap: FarmAnalyticItem[];
}

export interface ApysAnalyticsItem {
  lendingPlatform: PLATFORMS;
  farmPlatform: string;
  pair: string;
  totalApy: string;
  borrowTokensApy: string;
  suppliedTokensApy: string;
  farmApy: string;
}

export interface StrategyApysAnalytics {
  strategy: StrategyDto;
  apys: ApysAnalyticsItem[];
}

const BNB_BORROW_COST_LIMIT = -10;

@Injectable()
export class BnbAnalyticsService {
  private readonly logger = new Logger(BnbAnalyticsService.name);

  constructor(
    private readonly farmStatsRepository: FarmStatsRepository,
    private readonly apyStatsRepository: ApyStatsRepository,
    private readonly pancakeEthService: PancakeEthService,
    private readonly lendingStatsRepository: LendingStatsRepository,
    private readonly farmEthService: FarmEthService,
    private readonly farmAnalyticService: FarmAnalyticService,
    private readonly strategiesService: StrategiesService,
    private readonly telegramService: TelegramService,
    private readonly blockchainsService: BlockchainsService,
    private readonly contractsService: ContractsService,
    private readonly swapPathsService: SwapPathsService,
    private readonly uniswapEthService: UniswapEthService,
    private readonly rollbarLogger: RollbarLogger,
    private readonly venusTokensInfoService: VenusTokensInfoService,
  ) {}

  async getSaveAndCheckVenusAnalyticsStat(
    web3: Web3,
  ): Promise<VenusTokenInfo[]> {
    const { isBnbBorrowCostCronEnabled } =
      await this.blockchainsService.getBnbBlockchainSettings();

    const results = await this.venusTokensInfoService.getAllVenusTokensInfo({
      web3,
    });

    for (const item of results) {
      try {
        await this.lendingStatsRepository.saveLendingStat(item);
      } catch (error) {
        this.logger.error({
          message: 'lendingStatsRepository.saveLendingStat',
          error,
          item,
        });
      }

      if (item.token !== TOKEN_NAMES.BNB || !isBnbBorrowCostCronEnabled) {
        continue;
      }

      try {
        const latestBnbInfo =
          await this.lendingStatsRepository.getLatestLendingTokenInfo({
            platform: PLATFORMS.VENUS,
            token: TOKEN_NAMES.BNB,
          });

        const { borrowApy: borrowApyCurrent } = item;
        const { borrowApy: borrowApyLatestStr } = latestBnbInfo;

        const borrowApyLatest = Number.parseFloat(borrowApyLatestStr);

        if (
          (borrowApyCurrent < BNB_BORROW_COST_LIMIT &&
            borrowApyLatest >= BNB_BORROW_COST_LIMIT) ||
          (borrowApyCurrent > BNB_BORROW_COST_LIMIT &&
            borrowApyLatest <= BNB_BORROW_COST_LIMIT)
        ) {
          await this.telegramService.sendMessageToGroup(
            TG_MESSAGES.BNB_BORROW_COST_CHANGE({
              platform: PLATFORMS.VENUS,
              borrowApy: borrowApyCurrent,
            }),
          );
        }
      } catch (error) {
        this.logger.error({
          message: 'telegram send BNB borrow cost',
          error,
          item,
        });
      }
    }

    return results;
  }

  async getAndSavePlatformFarmsAnalyticStat(data: {
    farmPools: FarmPool[];
    blockchainId: number;
    platform: PLATFORMS;
    web3: Web3;
  }): Promise<FarmAnalyticItem[]> {
    const { farmPools, blockchainId, platform, web3 } = data;

    this.logger.debug({
      message: 'getAndSavePlatformFarmsAnalyticStat start',
      blockchainId,
      platform,
    });

    const result: FarmAnalyticItem[] = [];

    const mapFarmPlatformsTokens =
      await this.contractsService.getFarmPlatformsTokens(blockchainId);

    const rewardToken = mapFarmPlatformsTokens.get(platform);

    const rewardTokenPrice = fromWeiToNum(
      await this.uniswapEthService.getTokenPriceUSD({
        asset: rewardToken.address,
        platform,
        web3,
      }),
    );

    const mapTokenPrice = new Map<string, number>();

    let totalAllocPoint: number;
    let totalRegularAllocPoint: number;
    let totalSpecialAllocPoint: number;

    if (platform === PLATFORMS.PANCAKESWAP) {
      ({ totalRegularAllocPoint, totalSpecialAllocPoint } =
        await this.pancakeEthService.getTotalAllocPoint(web3));
    } else {
      totalAllocPoint = await this.farmAnalyticService.getTotalAllocPoint({
        platform,
        blockchainId,
        web3,
      });
    }

    for (const item of farmPools) {
      if (!item.isBorrowable) {
        continue;
      }

      const farmPriceInfo = await this.farmEthService.getFarmPoolPriceInfo({
        farmPool: item,
        mapTokenPrice,
        web3,
      });

      const farmRewardInfo = await (platform === PLATFORMS.PANCAKESWAP
        ? this.pancakeEthService.getFarmRewardsInfo({
            farmPool: item,
            lpInfo: farmPriceInfo,
            rewardTokenPrice,
            totalRegularAllocPoint,
            totalSpecialAllocPoint,
          })
        : this.farmAnalyticService.getFarmRewardsInfo({
            farmPool: item,
            lpInfo: farmPriceInfo,
            rewardTokenPrice,
            blockchainId,
            totalAllocPoint,
            web3,
          }));

      await this.farmStatsRepository.saveFarmStat({
        token1: farmPriceInfo.token1,
        token2: farmPriceInfo.token2,
        market: farmPriceInfo.platform,
        pair: farmPriceInfo.pair,
        lpAddress: farmPriceInfo.lpAddress,
        apr: farmRewardInfo.apr.toString(),
        poolLiquidityUsd: farmRewardInfo.poolLiquidityUsd.toString(),
        poolWeight: farmRewardInfo.poolWeight.toString(),
        lpPrice: farmPriceInfo.lpPrice.toString(),
        token1Liquidity: farmPriceInfo.token1Liquidity.toString(),
        token1Price: farmPriceInfo.token1Price.toString(),
        token2Liquidity: farmPriceInfo.token2Liquidity.toString(),
        token2Price: farmPriceInfo.token2Price.toString(),
        totalSupply: farmPriceInfo.totalSupply.toString(),
      });
      const farm = this.farmAnalyticService.farmPoolToFarm(item);

      result.push({
        farm,
        farmLp: farmPriceInfo,
        rewardInfo: farmRewardInfo,
      });
    }

    this.logger.debug({
      message: 'getAndSavePlatformFarmsAnalyticStat finish',
      blockchainId,
      platform,
    });

    return result;
  }

  async getAndSaveFarmsAnalyticStat(web3: Web3): Promise<FarmsAnalytic> {
    try {
      const blockchain = await this.blockchainsService.getBlockchainByName(
        BLOCKCHAIN_NAMES.BNB,
      );

      const farmPlatforms = [
        PLATFORMS.PANCAKESWAP,
        PLATFORMS.APESWAP,
        PLATFORMS.BISWAP,
        PLATFORMS.BOLIDE,
      ];

      const farmPools: FarmPool[] = [];

      const mapPlatformAnalyticStat = new Map<PLATFORMS, FarmAnalyticItem[]>();

      for (const platform of farmPlatforms) {
        const pools = await this.farmAnalyticService.getFarmPools({
          platform,
          web3,
        });
        farmPools.push(...pools);

        if (platform !== PLATFORMS.BOLIDE) {
          const farmsAnalyticStat =
            await this.getAndSavePlatformFarmsAnalyticStat({
              farmPools: pools,
              blockchainId: blockchain.id,
              platform,
              web3,
            });

          mapPlatformAnalyticStat.set(platform, farmsAnalyticStat);
        }
      }

      const farms = farmPools.map((item) =>
        this.farmAnalyticService.farmPoolToFarm(item),
      );

      await this.syncFarmsAndLpContracts(blockchain.id, farms);

      const pancake = mapPlatformAnalyticStat.get(PLATFORMS.PANCAKESWAP);
      const apeswap = mapPlatformAnalyticStat.get(PLATFORMS.APESWAP);
      const biswap = mapPlatformAnalyticStat.get(PLATFORMS.BISWAP);

      return {
        pancake,
        apeswap,
        biswap,
      };
    } catch (error) {
      this.logger.error({
        message: 'getAndSaveFarmsAnalyticStat error',
        error,
      });

      return {
        pancake: [],
        apeswap: [],
        biswap: [],
      };
    }
  }

  getLendToken = (token: string, lends: VenusTokenInfo[]) =>
    lends.find((element) => element.token === token);

  getSuppliedDataTokens = (
    lends: VenusTokenInfo[],
  ): {
    tokens: Array<{ token: string; amount: number }>;
    totalAmountUSD: Decimal;
    maxBorrowUSD: Decimal;
    collateral: Decimal;
    suppliedTokensApy: Decimal;
  } => {
    const tokens = [
      {
        token: TOKEN_NAMES.USDT,
        amount: 10_000,
      },
      {
        token: TOKEN_NAMES.BUSD,
        amount: 1000,
      },
    ];

    let totalAmountUSD = new Decimal(0);
    let collateralSum = new Decimal(0);
    let suppliedTokensApySum = new Decimal(0);

    for (const token of tokens) {
      const lendToken = this.getLendToken(token.token, lends);

      const amount = new Decimal(lendToken.tokenPrice).mul(token.amount);
      totalAmountUSD = totalAmountUSD.plus(amount);

      const totalApy = new Decimal(lendToken.supplyVenusApy).plus(
        lendToken.supplyApy,
      );

      const sum = totalApy.mul(amount);

      suppliedTokensApySum = suppliedTokensApySum.plus(sum);

      collateralSum = collateralSum.plus(
        new Decimal(lendToken.collateralFactor).mul(amount),
      );
    }

    const collateral = collateralSum.div(totalAmountUSD);

    // avg collateral
    const suppliedTokensApy = suppliedTokensApySum.div(totalAmountUSD);
    // avg apy
    const maxBorrowUSD = totalAmountUSD.mul(collateral);

    return {
      tokens,
      totalAmountUSD,
      maxBorrowUSD,
      collateral,
      suppliedTokensApy,
    };
  };

  async calcLendingAndFarmmsApys(data: {
    analytics: FarmAnalyticItem[];
    lends: VenusTokenInfo[];
    lending: PLATFORMS;
    strategyId: number;
  }): Promise<ApysAnalyticsItem[]> {
    const { analytics, lends, lending, strategyId } = data;

    const strategy = await this.strategiesService.getStrategyById(strategyId);

    const settings = strategy.settings as LandBorrowFarmSettingsDto;

    const suppliedTokens = this.getSuppliedDataTokens(lends);

    const suppliedTokensApy = suppliedTokens.suppliedTokensApy;

    if (!settings.borrowLimitPercentage) {
      this.rollbarLogger.error(
        new LogicException(
          ERROR_CODES.BORROW_LIMIT_PERCENTAGE_UNDEFINED({ strategyId }),
        ),
        'calcLendingAndFarmmsApys',
      );

      return [];
    }

    const borrowAmount = suppliedTokens.maxBorrowUSD.mul(
      settings.borrowLimitPercentage,
    );

    const result: ApysAnalyticsItem[] = [];

    for (const analyticItem of analytics) {
      const token1LendInfo = this.getLendToken(analyticItem.farm.token1, lends);
      const token2LendInfo = this.getLendToken(analyticItem.farm.token2, lends);

      if (token1LendInfo && token2LendInfo) {
        const borrowTokensApy = borrowAmount
          .mul(
            new Decimal(token1LendInfo.borrowApy)
              .plus(token1LendInfo.borrowVenusApy)
              .plus(token2LendInfo.borrowApy)
              .plus(token2LendInfo.borrowVenusApy),
          )
          .div(2)
          .div(suppliedTokens.totalAmountUSD);

        const farmApy = new Decimal(analyticItem.rewardInfo.apr)
          .mul(borrowAmount)
          .div(suppliedTokens.totalAmountUSD);

        const totalApy = suppliedTokensApy.plus(borrowTokensApy).plus(farmApy);

        result.push({
          lendingPlatform: lending,
          farmPlatform: analyticItem.farm.platform,
          pair: analyticItem.farm.pair,
          totalApy: totalApy.toString(),
          borrowTokensApy: borrowTokensApy.toString(),
          suppliedTokensApy: suppliedTokensApy.toString(),
          farmApy: farmApy.toString(),
        });
      }
    }

    return result;
  }

  async getAndSaveApysAnalyticsStat(data: {
    pancake: FarmAnalyticItem[];
    apeswap: FarmAnalyticItem[];
    biswap: FarmAnalyticItem[];
    allVenusTokensInfo: VenusTokenInfo[];
    strategyId: number;
  }): Promise<ApysAnalyticsItem[]> {
    const { pancake, apeswap, biswap, allVenusTokensInfo, strategyId } = data;
    const analytics: FarmAnalyticItem[] = [...pancake, ...apeswap, ...biswap];

    const results = await this.calcLendingAndFarmmsApys({
      analytics,
      lends: allVenusTokensInfo,
      lending: PLATFORMS.VENUS,
      strategyId,
    });

    for (const item of results) {
      try {
        await this.apyStatsRepository.saveApyStat(strategyId, item);
      } catch (error) {
        this.logger.error({
          message: 'apyStatsRepository.saveApyStat',
          error,
          item,
        });
      }
    }

    return results;
  }

  async getAndSaveFarmsLendingsApysStat(
    web3: Web3,
  ): Promise<StrategyApysAnalytics[]> {
    const farmsAnalytic = await this.getAndSaveFarmsAnalyticStat(web3);

    const allVenusTokensInfo = await this.getSaveAndCheckVenusAnalyticsStat(
      web3,
    );

    const res: StrategyApysAnalytics[] = [];

    const activeStrategies = await this.strategiesService.getActiveStrategies();

    for (const strategy of activeStrategies) {
      const apys = await this.getAndSaveApysAnalyticsStat({
        ...farmsAnalytic,
        allVenusTokensInfo,
        strategyId: strategy.id,
      });

      res.push({ strategy, apys });
    }

    return res;
  }

  async syncFarmsAndLpContracts(blockchainId: number, farms: Farm[]) {
    const ids = [];

    const { isNotifyIfLpPairAdded, isNotifyIfLpPairRemoved } =
      await this.blockchainsService.getBnbBlockchainSettings();

    for (const farm of farms) {
      const [token1, token2] = await this.contractsService.getTokensByNames(
        blockchainId,
        [farm.token1, farm.token2],
      );

      const { dto, isInserted } =
        await this.contractsService.createOrUpdateContract({
          blockchainId,
          platform: farm.platform,
          type: CONTRACT_TYPES.LP_TOKEN,
          name: `${farm.token1}-${farm.token2}`,
          address: farm.lpAddress,
          data: {
            fromTokenId: token1.id,
            toTokenId: token2.id,
            pid: farm.pid,
            isBorrowable: farm.isBorrowable,
          },
        });

      ids.push(dto.id);

      if (isInserted) {
        this.logger.debug({
          message: 'syncFarmsAndLpContracts addPair',
          platform: farm.platform,
          name: farm.pair,
        });

        await this.swapPathsService.createSwapPathForTokensIfNotExists({
          blockchainId,
          platform: farm.platform,
          fromTokenId: token1.id,
          toTokenId: token2.id,
        });

        if (isNotifyIfLpPairAdded) {
          await this.telegramService.sendMessageToGroup(
            TG_MESSAGES.LP_CONTRACT_ADDED({
              platform: farm.platform,
              pairName: farm.pair,
            }),
          );
        }
      }
    }

    const contracts = await this.contractsService.getFarmContracts(
      blockchainId,
    );

    for (const contract of contracts) {
      if (!ids.includes(contract.id)) {
        const strategies = await this.strategiesService.getStrategiesByPairId(
          contract.id,
        );

        if (strategies.length === 0) {
          await this.contractsService.deleteContract(contract.id);

          this.logger.debug({
            message: 'syncFarmsAndLpContracts deletePair',
            platform: contract.platform,
            name: contract.name,
          });
        } else if (isNotifyIfLpPairRemoved) {
          await this.telegramService.sendMessageToGroup(
            TG_MESSAGES.LP_CONTRACT_DELETED({
              platform: contract.platform,
              pairName: contract.name,
              strategies,
            }),
          );
        }
      }
    }
  }
}
