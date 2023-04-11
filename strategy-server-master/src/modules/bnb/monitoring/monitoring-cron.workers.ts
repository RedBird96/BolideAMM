import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RollbarLogger } from 'nestjs-rollbar';
import { BLOCKCHAIN_NAMES } from 'src/common/constants/blockchain-names';
import { PLATFORMS } from 'src/common/constants/platforms';
import { BlockchainsService } from 'src/modules/blockchains/blockchains.service';

import { BNB_BULL_EVENTS, BnbQueuesService } from '../bnb-queues.service';
import { BnbWeb3Service, WEB3_CONTEXT } from '../bnb-web3.service';
import type { BnbSettingsDto } from '../dto/BnbSettingsDto';
import { MonitoringService } from './monitoring.service';

const MONITORING_TABLES_REMOVE_OLD_DATA = 'monitoring_tables_remove_old_data';

@Injectable()
export class MonitoringCronWorkers {
  private readonly logger = new Logger(MonitoringCronWorkers.name);

  constructor(
    private readonly rollbarLogger: RollbarLogger,
    private readonly monitoringService: MonitoringService,
    private readonly blockchainsService: BlockchainsService,
    @Inject(forwardRef(() => BnbQueuesService))
    private readonly bnbQueuesService: BnbQueuesService,
    private readonly bnbWeb3Service: BnbWeb3Service,
  ) {}

  async initWorkers(): Promise<void> {
    const blockchain = await this.blockchainsService.getBlockchainByName(
      BLOCKCHAIN_NAMES.BNB,
    );
    const settings = blockchain.settings as BnbSettingsDto;

    const {
      isMonitoringPairsCronEnabled,
      monitoringPairsCronTimeoutMilleseconds,
    } = settings;

    if (isMonitoringPairsCronEnabled) {
      await this.bnbQueuesService.createMonitoringWorker({
        handler: () => this.monitoringTokens(),
      });

      const queue = await this.bnbQueuesService.getMonitoringQueue();

      await queue.add(
        BNB_BULL_EVENTS.MONITORING_TOKENS_CRON_NAME,
        {},
        {
          repeat: {
            every: monitoringPairsCronTimeoutMilleseconds,
          },
        },
      );
    }
  }

  async monitoringTokens(): Promise<void> {
    const blockchain = await this.blockchainsService.getBlockchainByName(
      BLOCKCHAIN_NAMES.BNB,
    );
    const settings = blockchain.settings as BnbSettingsDto;

    const {
      isMonitoringPairsCronEnabled,
      tokensRationChangePercentForReaction,
    } = settings;

    if (isMonitoringPairsCronEnabled) {
      try {
        const web3 = await this.bnbWeb3Service.createInstance(
          WEB3_CONTEXT.ANALYTICS,
        );

        await this.monitoringService.loadAndSaveMonitoringTokens({
          platforms: [PLATFORMS.PANCAKESWAP],
          web3,
        });

        await this.monitoringService.calculateAndSaveMonitoringPairs();

        await this.monitoringService.checkPriceRation(
          tokensRationChangePercentForReaction,
        );
      } catch (error) {
        this.logger.error({ message: 'monitoringTokens', error });
        this.rollbarLogger.error('monitoringTokens', { error });
      }
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM, {
    name: MONITORING_TABLES_REMOVE_OLD_DATA,
  })
  async monitoringTablesRemoveOldData(): Promise<void> {
    const blockchain = await this.blockchainsService.getBlockchainByName(
      BLOCKCHAIN_NAMES.BNB,
    );
    const settings = blockchain.settings as BnbSettingsDto;

    const { isMonitoringPairsCronEnabled, removePairsAfterDays } = settings;

    if (isMonitoringPairsCronEnabled) {
      try {
        const date = new Date();
        date.setDate(date.getDate() - removePairsAfterDays);
        await this.monitoringService.removeOldData(date.toISOString());
      } catch (error) {
        this.logger.error({ message: 'monitoringTablesRemoveOldData', error });
        this.rollbarLogger.error('monitoringTablesRemoveOldData', { error });
      }
    }
  }
}
