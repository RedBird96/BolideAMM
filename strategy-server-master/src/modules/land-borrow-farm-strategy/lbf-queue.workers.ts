import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { RollbarLogger } from 'nestjs-rollbar';
import { ERROR_CODES } from 'src/common/constants/error-codes';
import { TG_MESSAGES } from 'src/common/constants/tg-messages';
import { LogicException } from 'src/common/logic.exception';

import { BalanceService } from '../bnb/balance.service';
import { BnbWeb3Service } from '../bnb/bnb-web3.service';
import { ContractsService } from '../contracts/contracts.service';
import type { OperationDto } from '../operations/dto/OperationDto';
import {
  OPERATION_RUN_TYPE,
  OPERATION_STATUS,
  OPERATION_TYPE,
} from '../operations/operation.entity';
import { OperationsService } from '../operations/operations.service';
import type { StrategyDto } from '../strategies/dto/StrategyDto';
import { StrategiesService } from '../strategies/strategies.service';
import { StrategiesQueuesService } from '../strategies/strategies-queues.service';
import { TelegramService } from '../telegram/telegram.service';
import { BolidLibService } from './bolide-lib.service';
import { BoostingService } from './boosting.service';
import { ClaimService } from './claim.service';
import { ClaimVenusService } from './claim-venus.service';
import { LBF_BULL_EVENTS } from './constants/lbf-bull-events';
import type { LandBorrowFarmSettingsDto } from './dto/LandBorrowFarmSettingsDto';
import { LbfService } from './lbf.service';

@Injectable()
export class LbfQueueWorkers {
  private readonly logger = new Logger(LbfQueueWorkers.name);

  constructor(
    @Inject(forwardRef(() => LbfService))
    private readonly lbfService: LbfService,
    private readonly operationService: OperationsService,
    private readonly balanceService: BalanceService,
    private readonly claimService: ClaimService,
    @Inject(forwardRef(() => StrategiesService))
    private readonly strategiesService: StrategiesService,
    private readonly rollbarLogger: RollbarLogger,
    private readonly boostingService: BoostingService,
    private readonly bnbWeb3Service: BnbWeb3Service,
    private readonly contractsService: ContractsService,
    @Inject(forwardRef(() => StrategiesQueuesService))
    private readonly strategiesQueuesService: StrategiesQueuesService,
    private readonly claimVenusService: ClaimVenusService,
    private readonly bolidLibService: BolidLibService,
    private readonly telegramService: TelegramService,
  ) {}

  errorHandler(job: Job, e: Error): void {
    if (e instanceof LogicException) {
      // @ts-expect-error https://github.com/nodejs/node/issues/3122#issuecomment-149337953
      const { code } = e.response.messages[0];

      if (code === ERROR_CODES.INACTIVE_STRATEGY.code) {
        return this.logger.warn({
          error: code,
          message: 'low risk strategy comsumer error',
          job,
        });
      }
    }

    this.logger.error({
      error: e,
      message: 'low risk strategy comsumer error',
      job,
    });

    this.rollbarLogger.error(e, 'low risk strategy comsumer error', { job });
  }

  async initWorkers(strategy: StrategyDto): Promise<void> {
    await this.strategiesQueuesService.createCoreWorker({
      strategy,
      handler: (job: Job) => this.handleLbfEvent(job),
    });
  }

  async checkJobOptAndReturnDataForHandle(job: Job): Promise<{
    operation: OperationDto;
    operationId: string;
    payload: { isNeedToRecreateAll?: boolean };
  }> {
    const { data } = job;
    const { operationId, payload = {} } = data;

    if (!operationId) {
      throw new LogicException(ERROR_CODES.NOT_FOUND_OPERATION);
    }

    const operation = await this.operationService.findOneById(operationId);

    return { operation, operationId, payload };
  }

  async handleLbfEvent(job): Promise<void> {
    const { operation, operationId, payload } =
      await this.checkJobOptAndReturnDataForHandle(job);

    this.logger.debug({
      message: 'handleLbfEvent',
      operation,
      operationId,
      payload,
      job,
    });

    try {
      if (operationId && operation) {
        switch (operation.type) {
          case OPERATION_TYPE.STRATEGY_RUN:
            await this.handleStrategyEvent({ operation, payload });
            break;
          case OPERATION_TYPE.CLAIM_RUN:
            await this.handleClaimEvent({ operation });
            break;
          case OPERATION_TYPE.WITHDRAW_ALL_TO_STORAGE:
            await this.handleWithdrawAllToStorageEvent(operation);
            break;
          case OPERATION_TYPE.RECREATE_RESERVES:
            await this.handleRecreateReservesEvent(operation);
            break;
          case OPERATION_TYPE.VENUS_CLAIM_RUN:
            await this.handleVenusClaimEvent({ operation });
            break;
        }
      }
    } catch (error) {
      this.errorHandler(job, error);
    }
  }

  async handleWithdrawAllToStorageEvent(operation): Promise<void> {
    const { id: operationId, meta, strategyId, type } = operation;

    this.logger.log({
      message: `Strategy (${strategyId}) operation ${type} (${operationId}) was started`,
    });

    try {
      const strategy = await this.strategiesService.getStrategyById(strategyId);
      const {
        operationsPrivateKeyId,
        logicContract,
        storageContract,
        settings,
      } = strategy;

      const { web3: operationsWeb3 } =
        await this.bnbWeb3Service.createWeb3AndAccount(operationsPrivateKeyId);

      const adminBalanceBefore = await this.balanceService.getAdminBalances({
        strategyId,
        web3: operationsWeb3,
      });

      const boostBalanceBefore = await this.boostingService.getBoostingBalances(
        strategyId,
      );

      await this.operationService.inProgressOperation({
        id: operationId,
        adminBalanceBefore,
        boostBalanceBefore,
        meta,
      });

      await this.bolidLibService.withdrawAllToStorage({
        uid: operationId,
        logicContract,
        storageContract,
        web3: operationsWeb3,
        strategyId,
        isTransactionProdMode: settings.isTransactionProdMode,
      });

      const updatedOperation = await this.operationService.findOneById(
        operationId,
      );

      await this.operationService.succeedOperation({
        id: operationId,
        metaToSave: {},
        meta: updatedOperation.meta,
      });
      this.logger.log({
        message: `Strategy (${strategyId}) operation ${type} (${operationId}) was finished success`,
        operationId,
      });
    } catch (error) {
      this.logger.warn({
        message: `Strategy (${strategyId}) operation ${type} (${operationId}) was failed`,
        operationId,
      });

      this.rollbarLogger.error(
        `Strategy (${strategyId}) operation ${type} (${operationId}) was failed`,
        {
          error,
        },
      );

      await this.operationService.failOperation(
        operationId,
        OPERATION_STATUS.FAILED,
      );

      throw error;
    }
  }

  async handleRecreateReservesEvent(operation): Promise<void> {
    const { id: operationId, meta, strategyId, type } = operation;

    this.logger.log({
      message: `Strategy (${strategyId}) operation ${type} (${operationId}) was started`,
    });

    try {
      const strategy = await this.strategiesService.getStrategyById(strategyId);
      const {
        operationsPrivateKeyId,
        logicContract,
        storageContract,
        settings,
      } = strategy;

      const { web3: operationsWeb3 } =
        await this.bnbWeb3Service.createWeb3AndAccount(operationsPrivateKeyId);

      const adminBalanceBefore = await this.balanceService.getAdminBalances({
        strategyId,
        web3: operationsWeb3,
      });

      const boostBalanceBefore = await this.boostingService.getBoostingBalances(
        strategyId,
      );

      await this.operationService.inProgressOperation({
        id: operationId,
        adminBalanceBefore,
        boostBalanceBefore,
        meta,
      });

      await this.bolidLibService.recreateReserves({
        uid: operationId,
        logicContract,
        storageContract,
        web3: operationsWeb3,
        strategyId,
        isTransactionProdMode: settings.isTransactionProdMode,
      });

      const updatedOperation = await this.operationService.findOneById(
        operationId,
      );

      await this.operationService.succeedOperation({
        id: operationId,
        metaToSave: {},
        meta: updatedOperation.meta,
      });
      this.logger.log({
        message: `Strategy (${strategyId}) operation ${type} (${operationId}) was finished success`,
        operationId,
      });
    } catch (error) {
      this.logger.warn({
        message: `Strategy (${strategyId}) operation ${type} (${operationId}) was failed`,
        operationId,
      });

      this.rollbarLogger.error(
        `Strategy (${strategyId}) operation ${type} (${operationId}) was failed`,
        {
          error,
        },
      );

      await this.operationService.failOperation(
        operationId,
        OPERATION_STATUS.FAILED,
      );

      throw error;
    }
  }

  async handleStrategyEvent(data: {
    operation: any;
    payload: any;
  }): Promise<void> {
    const { operation, payload } = data;
    const { id: operationId, meta, strategyId, type, status } = operation;

    const strategy = await this.strategiesService.getStrategyById(strategyId);
    const settings = strategy.settings as LandBorrowFarmSettingsDto;
    const { operationsPrivateKeyId } = strategy;

    const { isAutostartEnabled, timeoutMilliseconds } = settings;
    const { runType } = operation;

    this.logger.log({
      message: `Strategy (${strategyId}) operation ${type} (${operationId}) was started`,
      operationId,
      isAutostartEnabled,
      timeoutMilliseconds,
    });

    try {
      const { web3: operationsWeb3 } =
        await this.bnbWeb3Service.createWeb3AndAccount(operationsPrivateKeyId);

      const adminBalanceBefore = await this.balanceService.getAdminBalances({
        strategyId,
        web3: operationsWeb3,
      });

      const boostBalanceBefore = await this.boostingService.getBoostingBalances(
        strategyId,
      );

      if (status === OPERATION_STATUS.IN_PROGRESS) {
        await this.operationService.failOperation(
          operationId,
          OPERATION_STATUS.FAILED,
        );
      } else {
        await this.operationService.inProgressOperation({
          id: operationId,
          adminBalanceBefore,
          boostBalanceBefore,
          meta,
        });

        if (isAutostartEnabled || runType === OPERATION_RUN_TYPE.API) {
          await this.lbfService.executeLowRiskStrategy(
            strategyId,
            true,
            true,
            payload?.isNeedToRecreateAll,
            operationId,
          );
        }

        const adminBalanceAfter = await this.balanceService.getAdminBalances({
          strategyId,
          web3: operationsWeb3,
        });

        const boostBalanceAfter =
          await this.boostingService.getBoostingBalances(strategyId);

        const updatedOperation = await this.operationService.findOneById(
          operationId,
        );

        await this.operationService.succeedOperation({
          id: operationId,
          metaToSave: {
            adminBalanceAfter,
            boostBalanceAfter,
          },
          meta: updatedOperation.meta,
        });

        this.logger.log({
          message: `Strategy (${strategyId}) operation ${type} (${operationId}) was finished success`,
        });
      }
    } catch (error) {
      this.logger.warn({
        message: `Strategy (${strategyId}) operation ${type} (${operationId}) was failed`,
        error,
      });

      this.rollbarLogger.error(
        `Strategy (${strategyId}) operation ${type} (${operationId}) was failed`,
        {
          error,
        },
      );

      await this.operationService.failOperation(
        operationId,
        OPERATION_STATUS.FAILED,
      );
    }

    if (isAutostartEnabled) {
      await this.lbfService.createOperationAndJob({
        strategy,
        delayInMills: timeoutMilliseconds,
        runType: OPERATION_RUN_TYPE.JOB,
        type: OPERATION_TYPE.STRATEGY_RUN,
        lbfBullEvent: LBF_BULL_EVENTS.STRATEGY_AND_CLAIM_JOB,
        payload: {},
      });
    }
  }

  async handleVenusClaimEvent(data: {
    operation: OperationDto;
  }): Promise<void> {
    const { operation } = data;
    const {
      id: operationId,
      meta,
      runType,
      strategyId,
      type,
      status,
    } = operation;

    const strategy = await this.strategiesService.getStrategyById(strategyId);

    if (!strategy) {
      throw new LogicException(ERROR_CODES.NOT_FOUND_STRATEGY);
    }

    const settings = strategy.settings as LandBorrowFarmSettingsDto;
    const {
      isVenusClaimAutostartEnabled,
      venusClaimTimeoutMilliseconds,
      isTransactionProdMode,
    } = settings;

    try {
      const {
        operationsPrivateKeyId,
        storageContractId,
        logicContractId,
        isActive,
      } = strategy;

      if (!isActive) {
        throw new LogicException(ERROR_CODES.INACTIVE_STRATEGY);
      }

      const storageContract = await this.contractsService.getContractById(
        storageContractId,
      );

      const logicContract = await this.contractsService.getContractById(
        logicContractId,
      );

      if (!storageContract || !logicContract) {
        throw new LogicException(ERROR_CODES.NOT_FOUND_CONTRACT_BY_ID);
      }

      const { web3: operationsWeb3 } =
        await this.bnbWeb3Service.createWeb3AndAccount(operationsPrivateKeyId);

      this.logger.log({
        message: `Strategy (${strategyId}) operation ${type} (${operationId}) was started`,
      });

      if (status === OPERATION_STATUS.IN_PROGRESS) {
        await this.operationService.failOperation(
          operationId,
          OPERATION_STATUS.FAILED,
        );
      } else {
        await this.operationService.inProgressOperation({
          id: operationId,
          meta,
        });

        if (
          isVenusClaimAutostartEnabled ||
          runType === OPERATION_RUN_TYPE.API
        ) {
          await this.claimVenusService.claimVenusRewards({
            uid: operationId,
            logicContract,
            storageContract,
            web3: operationsWeb3,
            isTransactionProdMode,
          });
        }

        const updatedOperation = await this.operationService.findOneById(
          operationId,
        );

        await this.operationService.succeedOperation({
          id: operationId,
          metaToSave: {},
          meta: updatedOperation.meta,
        });
      }

      this.logger.log({
        message: `Strategy (${strategyId}) operation ${type} (${operationId}) was finished`,
      });
    } catch (error) {
      this.logger.warn({
        message: `Strategy (${strategyId}) operation ${type} (${operationId}) was failed`,
        error,
      });

      this.rollbarLogger.error(
        `Strategy (${strategyId}) operation ${type} (${operationId}) was failed`,
        {
          error,
        },
      );

      await this.operationService.failOperation(
        operationId,
        OPERATION_STATUS.FAILED,
      );
    }

    if (isVenusClaimAutostartEnabled) {
      await this.lbfService.createOperationAndJob({
        strategy,
        delayInMills: venusClaimTimeoutMilliseconds,
        runType: OPERATION_RUN_TYPE.JOB,
        type: OPERATION_TYPE.VENUS_CLAIM_RUN,
        lbfBullEvent: LBF_BULL_EVENTS.STRATEGY_AND_CLAIM_JOB,
        payload: {},
      });
    }
  }

  async handleClaimEvent(data: { operation: OperationDto }): Promise<void> {
    const { operation } = data;
    const {
      id: operationId,
      meta,
      runType,
      strategyId,
      type,
      status,
    } = operation;

    const strategy = await this.strategiesService.getStrategyById(strategyId);

    if (!strategy) {
      throw new LogicException(ERROR_CODES.NOT_FOUND_STRATEGY);
    }

    const settings = strategy.settings as LandBorrowFarmSettingsDto;
    const {
      isClaimAutostartEnabled,
      claimTimeoutMilliseconds,
      isTransactionProdMode,
      isFailedDistributeNotification,
    } = settings;

    try {
      const {
        operationsPrivateKeyId,
        storageContractId,
        logicContractId,
        isActive,
      } = strategy;

      if (!isActive) {
        throw new LogicException(ERROR_CODES.INACTIVE_STRATEGY);
      }

      const storageContract = await this.contractsService.getContractById(
        storageContractId,
      );

      const logicContract = await this.contractsService.getContractById(
        logicContractId,
      );

      if (!storageContract || !logicContract) {
        throw new LogicException(ERROR_CODES.NOT_FOUND_CONTRACT_BY_ID);
      }

      const { web3: operationsWeb3 } =
        await this.bnbWeb3Service.createWeb3AndAccount(operationsPrivateKeyId);

      this.logger.log({
        message: `Strategy (${strategyId}) operation ${type} (${operationId}) was started`,
      });

      if (status === OPERATION_STATUS.IN_PROGRESS) {
        await this.operationService.failOperation(
          operationId,
          OPERATION_STATUS.FAILED,
        );
      } else {
        const adminBalanceBefore = await this.balanceService.getAdminBalances({
          strategyId,
          web3: operationsWeb3,
        });

        const boostBalanceBefore =
          await this.boostingService.getBoostingBalances(strategyId);

        await this.operationService.inProgressOperation({
          id: operationId,
          adminBalanceBefore,
          boostBalanceBefore,
          meta,
        });

        if (isClaimAutostartEnabled || runType === OPERATION_RUN_TYPE.API) {
          try {
            await this.claimService.runClaimRewards({
              operationId,
              logicContract,
              storageContract,
              strategyId,
              web3: operationsWeb3,
              isTransactionProdMode,
            });
          } catch (error) {
            if (isFailedDistributeNotification) {
              await this.telegramService.sendMessageToGroup(
                TG_MESSAGES.DISTRIBUTE_FAILED({ error, operationId }),
              );
            }
          }
        }

        const updatedOperation = await this.operationService.findOneById(
          operationId,
        );

        await this.operationService.succeedOperation({
          id: operationId,
          metaToSave: {},
          meta: updatedOperation.meta,
        });
      }

      this.logger.log({
        message: `Strategy (${strategyId}) operation ${type} (${operationId}) was finished`,
      });
    } catch (error) {
      this.logger.warn({
        message: `Strategy (${strategyId}) operation ${type} (${operationId}) was failed`,
        error,
      });

      this.rollbarLogger.error(
        `Strategy (${strategyId}) operation ${type} (${operationId}) was failed`,
        {
          error,
        },
      );

      await this.operationService.failOperation(
        operationId,
        OPERATION_STATUS.FAILED,
      );
    }

    if (isClaimAutostartEnabled) {
      await this.lbfService.createOperationAndJob({
        strategy,
        delayInMills: claimTimeoutMilliseconds,
        runType: OPERATION_RUN_TYPE.JOB,
        type: OPERATION_TYPE.CLAIM_RUN,
        lbfBullEvent: LBF_BULL_EVENTS.STRATEGY_AND_CLAIM_JOB,
        payload: {},
      });
    }
  }

  handleAll(job: Job): void {
    const { name, data } = job;

    this.logger.error({
      message: 'Unhandled lbf job event',
      name,
      data,
    });
  }
}
