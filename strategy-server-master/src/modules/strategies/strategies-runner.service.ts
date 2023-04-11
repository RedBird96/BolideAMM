import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { ERROR_CODES } from 'src/common/constants/error-codes';
import { STRATEGY_TYPES } from 'src/common/constants/strategy-types';
import { LogicException } from 'src/common/logic.exception';

import { LbfService } from '../land-borrow-farm-strategy/lbf.service';
import { LbfCronWorkers } from '../land-borrow-farm-strategy/lbf-cron.workers';
import { LbfQueueWorkers } from '../land-borrow-farm-strategy/lbf-queue.workers';
import { OPERATION_STATUS } from '../operations/operation.entity';
import { OperationsService } from '../operations/operations.service';
import type { StrategyDto } from './dto/StrategyDto';
import { SettingsValidationService } from './settings-validation.service';
import { StrategiesService } from './strategies.service';
import { StrategiesQueuesService } from './strategies-queues.service';

@Injectable()
export class StrategiesRunnerService {
  private readonly logger = new Logger(StrategiesRunnerService.name);

  constructor(
    @Inject(forwardRef(() => LbfService))
    private readonly lbfService: LbfService,
    private readonly lbfQueueWorkers: LbfQueueWorkers,
    private readonly lbfCronConsumers: LbfCronWorkers,
    private readonly operationsService: OperationsService,
    private readonly strategiesQueuesService: StrategiesQueuesService,
    @Inject(forwardRef(() => StrategiesService))
    private readonly strategiesService: StrategiesService,
    private readonly settingsValidationService: SettingsValidationService,
  ) {}

  async onModuleInit(): Promise<void> {
    const activeStrategies = await this.strategiesService.getActiveStrategies();

    for (const strategy of activeStrategies) {
      try {
        await this.runStrategy({
          strategy,
        });
      } catch (error) {
        this.logger.error({
          message: 'createQueuesAndRunStrategy runStrategy',
          error,
        });
      }
    }
  }

  async onApplicationShutdown() {
    const inProgressOperations =
      await this.operationsService.getAllInProgressOperations();

    for (const operation of inProgressOperations) {
      const { id, pid } = operation;

      if (pid === process.pid) {
        await this.operationsService.failOperation(
          id,
          OPERATION_STATUS.FAILED_SHUTDOWN,
        );
      }
    }
  }

  async toFailAllPendingAndProgressOperations(strategyId: number) {
    try {
      const operations =
        await this.operationsService.getAllProgressAndPendingOperations(
          strategyId,
        );

      for (const operation of operations) {
        const { id, pid } = operation;

        if (pid === process.pid) {
          await this.operationsService.failOperation(
            id,
            OPERATION_STATUS.FAILED_SHUTDOWN,
          );
        }
      }
    } catch (error) {
      this.logger.error({
        message: 'toFailAllPendingAndProgressOperations',
        error,
      });
    }
  }

  async runStrategy(data: { strategy: StrategyDto }) {
    const { strategy } = data;
    const { type, id, name } = strategy;

    await this.strategiesQueuesService.createQueues(strategy);

    this.logger.debug({
      message: `runStrategy id: ${id} name: ${name}`,
      strategy,
    });

    const isValid =
      await this.settingsValidationService.validateSettingsAndSendNoti(id);

    if (!isValid) {
      throw new LogicException(ERROR_CODES.SETTINGS_SETTINGS_INVALID);
    }

    switch (type) {
      case STRATEGY_TYPES.LAND_BORROW_FARM:
        await this.lbfService.initOperations({
          strategy,
        });
        await this.lbfService.initCronTasks({
          strategy,
        });
        await this.lbfQueueWorkers.initWorkers(strategy);
        await this.lbfCronConsumers.initWorkers(strategy);
        break;
      case STRATEGY_TYPES.LAND_BORROW:
        await this.runLandBorrowStrategy(strategy);
        break;
      case STRATEGY_TYPES.SWAP_FARM:
        await this.runSwapFarmStrategy(strategy);
        break;
    }
  }

  async stopStrategy(data: { strategy: StrategyDto }) {
    const { strategy } = data;
    const { type, id } = strategy;

    switch (type) {
      case STRATEGY_TYPES.LAND_BORROW_FARM:
        await this.toFailAllPendingAndProgressOperations(id);
        await this.strategiesQueuesService.gracefulShutdownQueuesAndWorkers(
          strategy,
        );
        break;
      case STRATEGY_TYPES.LAND_BORROW:
        await this.stopLandBorrowStrategy(strategy);
        break;
      case STRATEGY_TYPES.SWAP_FARM:
        await this.stopLandBorrowStrategy(strategy);
        break;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async stopLandBorrowStrategy(strategy: StrategyDto) {
    this.logger.error({
      message: 'stop land borrow strategy is not implemented',
    });

    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async stopSwapFarmStrategy(strategy: StrategyDto) {
    this.logger.error({
      message: 'stop swap farm strategy is not implemented',
    });

    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async runLandBorrowStrategy(strategy: StrategyDto) {
    this.logger.error({
      message: 'run land borrow strategy is not implemented',
    });

    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async runSwapFarmStrategy(strategy: StrategyDto) {
    this.logger.error({
      message: 'run swap farm strategy is not implemented',
    });

    return null;
  }
}
