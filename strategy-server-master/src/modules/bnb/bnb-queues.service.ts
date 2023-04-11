import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import type { Queue } from 'bullmq';

import { BullMqService } from '../queues/bullmq.service';
import { BnbAnalyticsWorkers } from './analytics/bnb-analytics.workers';
import { ApyCronWorkers } from './apy/apy-cron.workers';
import { MonitoringCronWorkers } from './monitoring/monitoring-cron.workers';
import { TvlCronWorkers } from './tvl/tvl-cron.workers';

// eslint-disable-next-line @typescript-eslint/naming-convention
export enum BNB_QUEUE_TYPES {
  MONITORING = 'MONITORING',
  ANALYTICS = 'ANALYTICS',
  TVL_HISTORY = 'TVL_HISTORY',
  APY_HISTORY = 'APY_HISTORY',
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export enum BNB_BULL_EVENTS {
  MONITORING_TOKENS_CRON_NAME = 'MONITORING_TOKENS_CRON_NAME',
  BNB_ANALYTICS_STAT_CRON_NAME = 'BNB_ANALYTICS_STAT_CRON_NAME',
  SAVE_TVL_HISTORY_CRON_NAME = 'SAVE_TVL_HISTORY_CRON_NAME',
  SAVE_APY_HISTORY_CRON_NAME = 'SAVE_APY_HISTORY_CRON_NAME',
}

@Injectable()
export class BnbQueuesService {
  private readonly logger = new Logger(BnbQueuesService.name);

  constructor(
    private readonly monitoringCronConsumers: MonitoringCronWorkers,
    @Inject(forwardRef(() => BnbAnalyticsWorkers))
    private readonly bnbAnalyticsCronConsumers: BnbAnalyticsWorkers,
    @Inject(forwardRef(() => BullMqService))
    private readonly bullMqService: BullMqService,
    private readonly tvlCronWorkers: TvlCronWorkers,
    private readonly apyCronConsumers: ApyCronWorkers,
  ) {}

  async onModuleInit(): Promise<void> {
    const createQueues: Array<Promise<Queue<any>>> = [];

    createQueues.push(
      this.getMonitoringQueue(),
      this.getAnalyticsQueue(),
      this.getApyHistoryQueue(),
      this.getTvlHistoryQueue(),
    );

    await Promise.all(createQueues);

    await this.monitoringCronConsumers.initWorkers();
    await this.bnbAnalyticsCronConsumers.initWorkers();
    await this.tvlCronWorkers.initWorkers();
    await this.apyCronConsumers.initWorkers();
  }

  createKey(type: BNB_QUEUE_TYPES) {
    return `bnb_queue_${type.toLowerCase()}`;
  }

  async getMonitoringQueue(): Promise<Queue<any, any, string>> {
    return this.bullMqService.getQueue(
      this.createKey(BNB_QUEUE_TYPES.MONITORING),
    );
  }

  async getAnalyticsQueue(): Promise<Queue<any, any, string>> {
    return this.bullMqService.getQueue(
      this.createKey(BNB_QUEUE_TYPES.ANALYTICS),
    );
  }

  async getApyHistoryQueue(): Promise<Queue<any, any, string>> {
    return this.bullMqService.getQueue(
      this.createKey(BNB_QUEUE_TYPES.APY_HISTORY),
    );
  }

  async getTvlHistoryQueue(): Promise<Queue<any, any, string>> {
    return this.bullMqService.getQueue(
      this.createKey(BNB_QUEUE_TYPES.TVL_HISTORY),
    );
  }

  async createMonitoringWorker(data: {
    handler: any;
    options?: any;
  }): Promise<any> {
    return this.bullMqService.createWorker({
      name: this.createKey(BNB_QUEUE_TYPES.MONITORING),
      handler: data.handler,
      options: data.options,
    });
  }

  async createAnalyticsWorker(data: {
    handler: any;
    options?: any;
  }): Promise<any> {
    return this.bullMqService.createWorker({
      name: this.createKey(BNB_QUEUE_TYPES.ANALYTICS),
      handler: data.handler,
      options: data.options,
    });
  }

  async createTvlHistoryWorker(data: {
    handler: any;
    options?: any;
  }): Promise<any> {
    return this.bullMqService.createWorker({
      name: this.createKey(BNB_QUEUE_TYPES.TVL_HISTORY),
      handler: data.handler,
      options: data.options,
    });
  }

  async createApyHistoryWorker(data: {
    handler: any;
    options?: any;
  }): Promise<any> {
    return this.bullMqService.createWorker({
      name: this.createKey(BNB_QUEUE_TYPES.APY_HISTORY),
      handler: data.handler,
      options: data.options,
    });
  }
}
