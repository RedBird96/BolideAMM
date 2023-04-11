import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { CronExpression } from '@nestjs/schedule';
import { RollbarLogger } from 'nestjs-rollbar';

import { BNB_BULL_EVENTS, BnbQueuesService } from '../bnb-queues.service';
import { BnbWeb3Service, WEB3_CONTEXT } from '../bnb-web3.service';
import { TvlService } from './tvl.service';

@Injectable()
export class TvlCronWorkers {
  private readonly logger = new Logger(TvlCronWorkers.name);

  constructor(
    private readonly rollbarLogger: RollbarLogger,
    private readonly tvlService: TvlService,
    @Inject(forwardRef(() => BnbQueuesService))
    private readonly bnbQueuesService: BnbQueuesService,
    private readonly bnbWeb3Service: BnbWeb3Service,
  ) {}

  async initWorkers(): Promise<void> {
    await this.bnbQueuesService.createTvlHistoryWorker({
      handler: () => this.saveTvlHistoryData(),
    });

    const queue = await this.bnbQueuesService.getTvlHistoryQueue();

    await queue.add(
      BNB_BULL_EVENTS.SAVE_TVL_HISTORY_CRON_NAME,
      {},
      {
        repeat: {
          cron: CronExpression.EVERY_DAY_AT_MIDNIGHT,
        },
      },
    );
  }

  async saveTvlHistoryData(): Promise<void> {
    try {
      const web3 = await this.bnbWeb3Service.createInstance(
        WEB3_CONTEXT.ANALYTICS,
      );

      await this.tvlService.fillTvlHistory(web3);
    } catch (error) {
      this.logger.error({ message: 'saveTvlHistoryData', error });
      this.rollbarLogger.error('saveTvlHistoryData', { error });
    }
  }
}
