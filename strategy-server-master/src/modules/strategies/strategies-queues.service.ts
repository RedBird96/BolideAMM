import { Injectable, Logger } from '@nestjs/common';
import type { Queue } from 'bullmq';
import type { STRATEGY_TYPES } from 'src/common/constants/strategy-types';

import { BullMqService } from '../queues/bullmq.service';
import type { StrategyDto } from './dto/StrategyDto';

// eslint-disable-next-line @typescript-eslint/naming-convention
export enum STRATEGY_QUEUE_TYPES {
  CORE = 'CORE',
  CRON = 'CRON',
}

@Injectable()
export class StrategiesQueuesService {
  private readonly logger = new Logger(StrategiesQueuesService.name);

  constructor(private readonly bullMqService: BullMqService) {}

  async createQueues(strategy: StrategyDto): Promise<void> {
    try {
      this.logger.debug({
        message: 'Create strategy queue:',
        strategyId: strategy.id,
      });

      await this.getCoreQueue(strategy);
      await this.getCronQueue(strategy);
    } catch (error) {
      this.logger.error({
        message: 'createQueuesAndRunStrategy queues',
        error,
      });
    }
  }

  async gracefulShutdownQueuesAndWorkers(strategy: StrategyDto): Promise<void> {
    const wokerOrQueueCronName = this.createQName(
      strategy.type,
      strategy.id,
      STRATEGY_QUEUE_TYPES.CRON,
    );

    const wokerOrQueueCoreName = this.createQName(
      strategy.type,
      strategy.id,
      STRATEGY_QUEUE_TYPES.CORE,
    );

    await this.bullMqService.gracefulShutdownByName(wokerOrQueueCronName);
    await this.bullMqService.gracefulShutdownByName(wokerOrQueueCoreName);

    await this.bullMqService.clearAndCloseQueueByName(wokerOrQueueCronName);
    await this.bullMqService.clearAndCloseQueueByName(wokerOrQueueCoreName);
  }

  createQName(type: STRATEGY_TYPES, id: number, qType: STRATEGY_QUEUE_TYPES) {
    return `${id}_${type.toLowerCase()}_${qType.toLowerCase()}`;
  }

  async getCoreQueue(strategy): Promise<Queue<any, any, string>> {
    return this.bullMqService.getQueue(
      this.createQName(strategy.type, strategy.id, STRATEGY_QUEUE_TYPES.CORE),
    );
  }

  async getCronQueue(strategy): Promise<Queue<any, any, string>> {
    return this.bullMqService.getQueue(
      this.createQName(strategy.type, strategy.id, STRATEGY_QUEUE_TYPES.CRON),
    );
  }

  async createCoreWorker(data: {
    strategy: StrategyDto;
    handler: any;
    options?: any;
  }): Promise<any> {
    return this.bullMqService.createWorker({
      name: this.createQName(
        data.strategy.type,
        data.strategy.id,
        STRATEGY_QUEUE_TYPES.CORE,
      ),
      handler: data.handler,
      options: data.options,
    });
  }

  async createCronWorker(data: {
    strategy: StrategyDto;
    handler: any;
    options?: any;
  }): Promise<any> {
    return this.bullMqService.createWorker({
      name: this.createQName(
        data.strategy.type,
        data.strategy.id,
        STRATEGY_QUEUE_TYPES.CRON,
      ),
      handler: data.handler,
      options: data.options,
    });
  }
}
