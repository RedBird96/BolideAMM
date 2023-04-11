import {
  CACHE_MANAGER,
  CacheStore,
  forwardRef,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { Job } from 'bullmq';
import Decimal from 'decimal.js';
import { RollbarLogger } from 'nestjs-rollbar';
import { ERROR_CODES } from 'src/common/constants/error-codes';
import { TG_MESSAGES } from 'src/common/constants/tg-messages';
import { LogicException } from 'src/common/logic.exception';

import { BalanceService } from '../bnb/balance.service';
import { BnbWeb3Service, WEB3_CONTEXT } from '../bnb/bnb-web3.service';
import { UniswapApiService } from '../bnb/uniswap/uniswap-api.serivce';
import type { StrategyDto } from '../strategies/dto/StrategyDto';
import { StrategiesService } from '../strategies/strategies.service';
import { StrategiesQueuesService } from '../strategies/strategies-queues.service';
import { TelegramService } from '../telegram/telegram.service';
import { LbfAnalyticsService } from './analytics/lbf-analytics.service';
import { BoostingService } from './boosting.service';
import { LBF_BULL_EVENTS } from './constants/lbf-bull-events';
import type { LandBorrowFarmSettingsDto } from './dto/LandBorrowFarmSettingsDto';

const NOTIFICATION_ADMIN_BNB_BALANCE_TO_LOW = (strategyId: number) =>
  `NOTIFICATION_ADMIN_BNB_BALANCE_TO_LOW_${strategyId}`;

@Injectable()
export class LbfCronWorkers {
  private readonly logger = new Logger(LbfCronWorkers.name);

  constructor(
    private balanceService: BalanceService,
    private telegramService: TelegramService,
    private bnbWeb3Service: BnbWeb3Service,
    private rollbarLogger: RollbarLogger,
    @Inject(forwardRef(() => StrategiesService))
    private strategiesService: StrategiesService,
    private boostingService: BoostingService,
    private uniswapApiService: UniswapApiService,
    @Inject(forwardRef(() => StrategiesQueuesService))
    private strategiesQueuesService: StrategiesQueuesService,
    @Inject(forwardRef(() => LbfAnalyticsService))
    private lbfAnalyticsService: LbfAnalyticsService,
    @Inject(CACHE_MANAGER)
    private cacheManager: CacheStore,
  ) {}

  errorHandler(job: Job, e: Error): void {
    this.logger.error({
      error: e,
      message: 'low risk strategy cron tasks comsumer error',
      job,
    });

    this.rollbarLogger.error(e, 'low risk strategy cron tasks comsumer error', {
      job,
    });
  }

  async initWorkers(strategy: StrategyDto): Promise<void> {
    await this.strategiesQueuesService.createCronWorker({
      strategy,
      handler: (job: Job) => this.handleCronEvents(job),
    });
  }

  async handleCronEvents(job: Job) {
    const { name } = job;

    switch (name) {
      case LBF_BULL_EVENTS.ADMIN_BALANCE_CRON_JOB:
        await this.checkAdminBalance(job);
        break;
      case LBF_BULL_EVENTS.ANALYTICS_CRON_JOB:
        await this.lbfAnalytics(job);
        break;
      case LBF_BULL_EVENTS.MONITORING_BOOSTING_BLID_BALANCES_CRON_NAME:
        await this.monitoringBlidBalances(job);
        break;
    }
  }

  async checkAdminBalance(job: Job): Promise<void> {
    const { strategy } = await this.checkJobOptAndReturnDataForHandle(job);

    const settings = strategy.settings as LandBorrowFarmSettingsDto;

    const { operationsPrivateKeyId, id: strategyId, isActive } = strategy;
    const {
      isAdminBalanceCronEnabled,
      adminMinBnbBalance,
      adminBalanceCheckTimeoutMilliseconds,
    } = settings;

    if (isActive && isAdminBalanceCronEnabled) {
      try {
        const { web3Account, web3 } =
          await this.bnbWeb3Service.createWeb3AndAccount(
            operationsPrivateKeyId,
          );

        const { bnbBalance } = await this.balanceService.getAdminBalances({
          strategyId,
          web3,
        });

        const minBalance = new Decimal(adminMinBnbBalance);

        const bnbBalanceDecimal = new Decimal(bnbBalance);

        const key = NOTIFICATION_ADMIN_BNB_BALANCE_TO_LOW(strategyId);
        const balanceResult = await this.cacheManager.get(key);

        if (minBalance.gte(bnbBalanceDecimal)) {
          if (balanceResult !== true) {
            await this.telegramService.sendMessageToGroup(
              TG_MESSAGES.ADMIN_BNB_BALANCE_TO_LOW({
                currentBalance: bnbBalance,
                minBalance: minBalance.toString(),
                adminWalletAddress: web3Account.address,
              }),
            );
            await this.cacheManager.set(key, true, { ttl: 0 });
          }
        } else {
          if (balanceResult !== false) {
            await this.telegramService.sendMessageToGroup(
              TG_MESSAGES.ADMIN_BNB_BALANCE_FINE({
                currentBalance: bnbBalance,
                adminWalletAddress: web3Account.address,
              }),
            );
            await this.cacheManager.set(key, false, { ttl: 0 });
          }
        }
      } catch (error) {
        this.logger.error({
          message: `check admin balance strategyId: ${strategyId}`,
          error,
          strategyId,
          jobData: job.data,
        });

        this.rollbarLogger.error(
          `check admin balance strategyId: ${strategyId}`,
          {
            error,
            jobData: job.data,
          },
        );
      }

      const queue = await this.strategiesQueuesService.getCronQueue(strategy);

      await queue.add(
        LBF_BULL_EVENTS.ADMIN_BALANCE_CRON_JOB,
        {
          strategyId,
          payload: {},
        },
        {
          delay: adminBalanceCheckTimeoutMilliseconds
            ? adminBalanceCheckTimeoutMilliseconds
            : 0,
        },
      );
    }
  }

  async lbfAnalytics(job: Job): Promise<void> {
    const { strategy } = await this.checkJobOptAndReturnDataForHandle(job);

    const settings = strategy.settings as LandBorrowFarmSettingsDto;

    const { id: strategyId, isActive } = strategy;
    const { isAnalyticsCronEnabled, analyticsTimeoutMilliseconds } = settings;

    if (isActive && isAnalyticsCronEnabled) {
      try {
        const web3 = await this.bnbWeb3Service.createInstance(
          WEB3_CONTEXT.ANALYTICS,
        );

        await this.lbfAnalyticsService.calcAnalyticsAndSaveResult({
          strategyId,
          web3,
        });
      } catch (error) {
        this.logger.error({
          message: `lbfAnalytics cron strategyId: ${strategyId}`,
          error,
          strategyId,
          jobData: job.data,
        });

        this.rollbarLogger.error(
          `lbfAnalytics cron strategyId: ${strategyId}`,
          {
            error,
            jobData: job.data,
          },
        );
      }

      const queue = await this.strategiesQueuesService.getCronQueue(strategy);

      await queue.add(
        LBF_BULL_EVENTS.ANALYTICS_CRON_JOB,
        {
          strategyId,
          payload: {},
        },
        {
          delay: analyticsTimeoutMilliseconds
            ? analyticsTimeoutMilliseconds
            : 0,
        },
      );
    }
  }

  async monitoringBlidBalances(job: Job): Promise<void> {
    const { strategy } = await this.checkJobOptAndReturnDataForHandle(job);

    const settings = strategy.settings as LandBorrowFarmSettingsDto;

    const { id: strategyId, isActive } = strategy;
    const {
      isBoostingBalanceCheckCronEnabled,
      boostingBalanceCheckTimeoutMilliseconds,
      boostingWalletMinBlidBalanceUsd,
    } = settings;

    if (isActive && isBoostingBalanceCheckCronEnabled) {
      try {
        const balances = await this.boostingService.getBoostingBalances(
          strategyId,
        );

        const { token1Price: blidPriceUsd } =
          await this.uniswapApiService.getUsdtBlidPoolData();

        const currentBlidBalanceUsd = new Decimal(balances.blidBalance)
          .mul(new Decimal(blidPriceUsd))
          .toNumber();

        if (currentBlidBalanceUsd < boostingWalletMinBlidBalanceUsd) {
          await this.telegramService.sendMessageToGroup(
            TG_MESSAGES.MIN_BLID_USD_BALANCE({
              currentBlidBalanceUsd: currentBlidBalanceUsd.toString(),
              minBlidBalanceUsd: boostingWalletMinBlidBalanceUsd.toString(),
            }),
          );
        }
      } catch (error) {
        this.logger.error({
          message: `monitoringBlidBalances cron strategyId: ${strategyId}`,
          error,
          strategyId,
          jobData: job.data,
        });

        this.rollbarLogger.error(
          `monitoringBlidBalances cron strategyId: ${strategyId}`,
          {
            error,
            jobData: job.data,
          },
        );
      }

      const queue = await this.strategiesQueuesService.getCronQueue(strategy);

      await queue.add(
        LBF_BULL_EVENTS.MONITORING_BOOSTING_BLID_BALANCES_CRON_NAME,
        {
          strategyId,
          payload: {},
        },
        {
          delay: boostingBalanceCheckTimeoutMilliseconds
            ? boostingBalanceCheckTimeoutMilliseconds
            : 0,
        },
      );
    }
  }

  async checkJobOptAndReturnDataForHandle(job: Job): Promise<{
    strategy: StrategyDto;
  }> {
    const { data } = job;
    const { strategyId } = data;

    if (!strategyId) {
      throw new LogicException(ERROR_CODES.NOT_FOUND_STRATEGY);
    }

    const strategy = await this.strategiesService.getStrategyById(strategyId);

    if (!strategy) {
      throw new LogicException(ERROR_CODES.NOT_FOUND_STRATEGY);
    }

    return { strategy };
  }
}
