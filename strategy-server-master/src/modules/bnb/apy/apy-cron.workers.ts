import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { CronExpression } from '@nestjs/schedule';
import { RollbarLogger } from 'nestjs-rollbar';

import { BNB_BULL_EVENTS, BnbQueuesService } from '../bnb-queues.service';
import { BnbWeb3Service, WEB3_CONTEXT } from '../bnb-web3.service';
import { ApyService } from './apy.service';

@Injectable()
export class ApyCronWorkers {
  private readonly logger = new Logger(ApyCronWorkers.name);

  constructor(
    private readonly rollbarLogger: RollbarLogger,
    private readonly apyService: ApyService,
    @Inject(forwardRef(() => BnbQueuesService))
    private readonly bnbQueuesService: BnbQueuesService,
    private readonly bnbWeb3Service: BnbWeb3Service,
  ) {}

  async initWorkers(): Promise<void> {
    await this.bnbQueuesService.createApyHistoryWorker({
      handler: () => this.saveApyHistoryData(),
    });

    const queue = await this.bnbQueuesService.getApyHistoryQueue();

    await queue.add(
      BNB_BULL_EVENTS.SAVE_APY_HISTORY_CRON_NAME,
      {},
      {
        repeat: {
          cron: CronExpression.EVERY_DAY_AT_MIDNIGHT,
        },
      },
    );
  }

  async saveApyHistoryData(): Promise<void> {
    try {
      const web3 = await this.bnbWeb3Service.createInstance(
        WEB3_CONTEXT.ANALYTICS,
      );

      await this.apyService.fillApyHistory(web3);
    } catch (error) {
      this.logger.error({ message: 'saveApyHistoryData', error });
      this.rollbarLogger.error('saveApyHistoryData', { error });
    }
  }
}
