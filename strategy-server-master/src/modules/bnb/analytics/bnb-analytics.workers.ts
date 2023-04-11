import { Injectable, Logger } from '@nestjs/common';
import { RollbarLogger } from 'nestjs-rollbar';
import { BLOCKCHAIN_NAMES } from 'src/common/constants/blockchain-names';
import { BlockchainsService } from 'src/modules/blockchains/blockchains.service';

import { BNB_BULL_EVENTS, BnbQueuesService } from '../bnb-queues.service';
import { BnbWeb3Service, WEB3_CONTEXT } from '../bnb-web3.service';
import type { BnbSettingsDto } from '../dto/BnbSettingsDto';
import { BnbAnalyticsService } from './bnb-analytics.service';

@Injectable()
export class BnbAnalyticsWorkers {
  private readonly logger = new Logger(BnbAnalyticsWorkers.name);

  constructor(
    private readonly bnbAnalyticsService: BnbAnalyticsService,
    private readonly rollbarLogger: RollbarLogger,
    private readonly blockchainsService: BlockchainsService,
    private readonly bnbQueuesService: BnbQueuesService,
    private readonly bnbWeb3Service: BnbWeb3Service,
  ) {}

  async initWorkers(): Promise<void> {
    const { isAnalyticsStatCronEnabled, analyticsStatCronTimeoutMilleseconds } =
      await this.getAnalyticsStatCronSettings();

    if (isAnalyticsStatCronEnabled) {
      await this.bnbQueuesService.createAnalyticsWorker({
        handler: () => this.saveFarmsLendingsApysStat(),
      });

      const queue = await this.bnbQueuesService.getAnalyticsQueue();

      await queue.add(
        BNB_BULL_EVENTS.BNB_ANALYTICS_STAT_CRON_NAME,
        {},
        {
          repeat: {
            every: analyticsStatCronTimeoutMilleseconds,
          },
        },
      );
    }
  }

  async saveFarmsLendingsApysStat(): Promise<void> {
    const { isAnalyticsStatCronEnabled } =
      await this.getAnalyticsStatCronSettings();

    if (isAnalyticsStatCronEnabled) {
      try {
        const web3 = await this.bnbWeb3Service.createInstance(
          WEB3_CONTEXT.ANALYTICS,
        );

        await this.bnbAnalyticsService.getAndSaveFarmsLendingsApysStat(web3);
      } catch (error) {
        this.logger.error({
          message: 'getAndSaveFarmsLendingsApysStat',
          error,
        });

        this.rollbarLogger.error(error, 'getAndSaveFarmsLendingsApysStat');
      }
    }
  }

  private async getAnalyticsStatCronSettings(): Promise<{
    isAnalyticsStatCronEnabled: boolean;
    analyticsStatCronTimeoutMilleseconds: number;
  }> {
    const blockchain = await this.blockchainsService.getBlockchainByName(
      BLOCKCHAIN_NAMES.BNB,
    );
    const settings = blockchain.settings as BnbSettingsDto;

    const { isAnalyticsStatCronEnabled, analyticsStatCronTimeoutMilleseconds } =
      settings;

    return {
      isAnalyticsStatCronEnabled,
      analyticsStatCronTimeoutMilleseconds,
    };
  }
}
