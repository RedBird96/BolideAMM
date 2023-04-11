import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { RollbarLogger } from 'nestjs-rollbar';
import { ERROR_CODES } from 'src/common/constants/error-codes';
import { ORDER } from 'src/common/constants/order';
import { TG_MESSAGES } from 'src/common/constants/tg-messages';
import { LogicException } from 'src/common/logic.exception';
import { fromWeiToNum, toWeiBN } from 'src/common/utils/big-number-utils';
import type Web3 from 'web3';

import { BnbWeb3Service } from '../bnb/bnb-web3.service';
import type { Farm } from '../bnb/interfaces/farm.interface';
import { UniswapEthService } from '../bnb/uniswap/uniswap-eth.service';
import { ContractsService } from '../contracts/contracts.service';
import type { ContractDto } from '../contracts/dto/ContractDto';
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
import { LBF_BULL_EVENTS } from './constants/lbf-bull-events';
import type { LandBorrowFarmSettingsDto } from './dto/LandBorrowFarmSettingsDto';
import { LiquidityInService } from './logic/liquidity-in.service';

export interface WalletBalances {
  bnbBalance: number;
  blidBalance: number;
}
@Injectable()
export class LbfService {
  private readonly logger = new Logger(LbfService.name);

  constructor(
    private readonly bolidLibService: BolidLibService,
    private readonly bnbWeb3Service: BnbWeb3Service,
    private readonly operationService: OperationsService,
    private readonly uniswapEthService: UniswapEthService,
    private readonly liquidityInService: LiquidityInService,
    private readonly rollbarLogger: RollbarLogger,
    @Inject(forwardRef(() => StrategiesService))
    private readonly strategiesService: StrategiesService,
    private readonly contractsService: ContractsService,
    private readonly telegramService: TelegramService,
    private readonly strategiesQueuesService: StrategiesQueuesService,
  ) {}

  async initCronTasks(data: { strategy: StrategyDto }) {
    const { strategy } = data;

    const { id: strategyId, isActive } = strategy;

    const settings = strategy.settings as LandBorrowFarmSettingsDto;

    const {
      isAdminBalanceCronEnabled,
      isAnalyticsCronEnabled,
      adminBalanceCheckTimeoutMilliseconds,
      analyticsTimeoutMilliseconds,
      isBoostingBalanceCheckCronEnabled,
      boostingBalanceCheckTimeoutMilliseconds,
    } = settings;

    const queue = await this.strategiesQueuesService.getCronQueue(strategy);

    this.logger.debug({
      message: 'initCronTasks',
      strategyId,
      isActive,
      isAdminBalanceCronEnabled,
    });

    if (isActive && isAdminBalanceCronEnabled) {
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

    this.logger.debug({
      message: 'initCronTasks',
      strategyId,
      isActive,
      isAnalyticsCronEnabled,
    });

    if (isActive && isAnalyticsCronEnabled) {
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

    this.logger.debug({
      message: 'initCronTasks',
      strategyId,
      isActive,
      isBoostingBalanceCheckCronEnabled,
    });

    if (isActive && isBoostingBalanceCheckCronEnabled) {
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

  async initOperations(data: { strategy: StrategyDto }) {
    const { strategy } = data;
    const { id: strategyId, settings } = strategy;
    const {
      isAutostartEnabled,
      isClaimAutostartEnabled,
      isVenusClaimAutostartEnabled,
      claimTimeoutMilliseconds,
      venusClaimTimeoutMilliseconds,
      timeoutMilliseconds,
    } = settings as LandBorrowFarmSettingsDto;

    if (isAutostartEnabled) {
      let inProgressOperation = null;

      const inPendingStrategyOperation =
        await this.operationService.getInPendingLbfOperation({
          type: OPERATION_TYPE.STRATEGY_RUN,
          strategyId,
        });

      const inPendingClaimOperation =
        await this.operationService.getInPendingLbfOperation({
          type: OPERATION_TYPE.CLAIM_RUN,
          strategyId,
        });

      const inPendingVenusClaimOperation =
        await this.operationService.getInPendingLbfOperation({
          type: OPERATION_TYPE.VENUS_CLAIM_RUN,
          strategyId,
        });

      inProgressOperation =
        await this.operationService.getInProgressLbfOperation({
          strategyId,
        });

      if (inProgressOperation) {
        const { type } = inProgressOperation;

        switch (type) {
          case OPERATION_TYPE.CLAIM_RUN:
            if (!inPendingStrategyOperation) {
              await this.createOperationAndJob({
                strategy,
                delayInMills: timeoutMilliseconds,
                runType: OPERATION_RUN_TYPE.JOB,
                type: OPERATION_TYPE.STRATEGY_RUN,
                lbfBullEvent: LBF_BULL_EVENTS.STRATEGY_AND_CLAIM_JOB,
                payload: {},
              });
            }

            if (!inPendingVenusClaimOperation && isVenusClaimAutostartEnabled) {
              await this.createOperationAndJob({
                strategy,
                delayInMills: venusClaimTimeoutMilliseconds,
                runType: OPERATION_RUN_TYPE.JOB,
                type: OPERATION_TYPE.VENUS_CLAIM_RUN,
                lbfBullEvent: LBF_BULL_EVENTS.STRATEGY_AND_CLAIM_JOB,
                payload: {},
              });
            }

            break;
          case OPERATION_TYPE.STRATEGY_RUN:
            if (!inPendingClaimOperation && isClaimAutostartEnabled) {
              await this.createOperationAndJob({
                strategy,
                delayInMills: claimTimeoutMilliseconds,
                runType: OPERATION_RUN_TYPE.JOB,
                type: OPERATION_TYPE.CLAIM_RUN,
                lbfBullEvent: LBF_BULL_EVENTS.STRATEGY_AND_CLAIM_JOB,
                payload: {},
              });
            }

            if (!inPendingVenusClaimOperation && isVenusClaimAutostartEnabled) {
              await this.createOperationAndJob({
                strategy,
                delayInMills: venusClaimTimeoutMilliseconds,
                runType: OPERATION_RUN_TYPE.JOB,
                type: OPERATION_TYPE.VENUS_CLAIM_RUN,
                lbfBullEvent: LBF_BULL_EVENTS.STRATEGY_AND_CLAIM_JOB,
                payload: {},
              });
            }

            break;

          case OPERATION_TYPE.VENUS_CLAIM_RUN:
            if (!inPendingClaimOperation && isClaimAutostartEnabled) {
              await this.createOperationAndJob({
                strategy,
                delayInMills: claimTimeoutMilliseconds,
                runType: OPERATION_RUN_TYPE.JOB,
                type: OPERATION_TYPE.CLAIM_RUN,
                lbfBullEvent: LBF_BULL_EVENTS.STRATEGY_AND_CLAIM_JOB,
                payload: {},
              });
            }

            if (!inPendingStrategyOperation) {
              await this.createOperationAndJob({
                strategy,
                delayInMills: timeoutMilliseconds,
                runType: OPERATION_RUN_TYPE.JOB,
                type: OPERATION_TYPE.STRATEGY_RUN,
                lbfBullEvent: LBF_BULL_EVENTS.STRATEGY_AND_CLAIM_JOB,
                payload: {},
              });
            }

            break;

          default:
            break;
        }
      } else {
        if (!inPendingStrategyOperation) {
          await this.createOperationAndJob({
            strategy,
            delayInMills: timeoutMilliseconds,
            runType: OPERATION_RUN_TYPE.JOB,
            type: OPERATION_TYPE.STRATEGY_RUN,
            lbfBullEvent: LBF_BULL_EVENTS.STRATEGY_AND_CLAIM_JOB,
            payload: {},
          });
        }

        if (!inPendingClaimOperation && isClaimAutostartEnabled) {
          await this.createOperationAndJob({
            strategy,
            delayInMills: claimTimeoutMilliseconds,
            runType: OPERATION_RUN_TYPE.JOB,
            type: OPERATION_TYPE.CLAIM_RUN,
            lbfBullEvent: LBF_BULL_EVENTS.STRATEGY_AND_CLAIM_JOB,
            payload: {},
          });
        }

        if (!inPendingVenusClaimOperation && isVenusClaimAutostartEnabled) {
          await this.createOperationAndJob({
            strategy,
            delayInMills: venusClaimTimeoutMilliseconds,
            runType: OPERATION_RUN_TYPE.JOB,
            type: OPERATION_TYPE.VENUS_CLAIM_RUN,
            lbfBullEvent: LBF_BULL_EVENTS.STRATEGY_AND_CLAIM_JOB,
            payload: {},
          });
        }
      }
    }
  }

  async checkBorrowLimitAndSendTgNoti(data: {
    currentPercent: number;
    strategyId: number;
  }): Promise<void> {
    const { currentPercent, strategyId } = data;

    const strategy = await this.strategiesService.getStrategyById(strategyId);

    const settings = strategy.settings as LandBorrowFarmSettingsDto;

    const BORROW_LIMIT_PERCENTAGE_MAX = settings.borrowLimitPercentageMax;

    const notiMaxPercent =
      BORROW_LIMIT_PERCENTAGE_MAX * 0.01 + BORROW_LIMIT_PERCENTAGE_MAX;

    if (currentPercent >= notiMaxPercent * 100) {
      await this.telegramService.sendMessageToGroup(
        TG_MESSAGES.BORROW_LIMIT_MAX({
          max: BORROW_LIMIT_PERCENTAGE_MAX,
          current: currentPercent,
        }),
      );
    }
  }

  async checkFarm(data: {
    farm: Farm;
    logicContract: ContractDto;
    storageContract: ContractDto;
    settings: LandBorrowFarmSettingsDto;
    web3: Web3;
  }): Promise<{
    isCheckValid: boolean;
    final: number;
  }> {
    const { farm, logicContract, settings, storageContract, web3 } = data;

    const CHECK_SUM_IN_USD = settings.farmCheckSumInUsd;
    const MAX_DIFF_PERCENT = settings.farmMaxDiffPercent;

    const a = await this.liquidityInService.calcPairAmounts({
      farm,
      liquidityWei: toWeiBN(CHECK_SUM_IN_USD),
      logicContract,
      storageContract,
      web3,
    });

    const p1 = await this.uniswapEthService.getTokenPriceUSD({
      asset: farm.token1,
      platform: farm.platform,
      web3,
    });

    const p2 = await this.uniswapEthService.getTokenPriceUSD({
      asset: farm.token2,
      platform: farm.platform,
      web3,
    });

    const final =
      fromWeiToNum(a.token1Amount) * fromWeiToNum(p1) +
      fromWeiToNum(a.token2Amount) * fromWeiToNum(p2);

    const isCheckValid = Math.abs(CHECK_SUM_IN_USD - final) < MAX_DIFF_PERCENT;

    return {
      isCheckValid,
      final,
    };
  }

  async createOperationAndJob(data: {
    strategy: StrategyDto;
    delayInMills?: number;
    runType: OPERATION_RUN_TYPE;
    type: OPERATION_TYPE;
    lbfBullEvent: LBF_BULL_EVENTS;
    payload: { isNeedToRecreateAll?: boolean };
  }): Promise<{
    operation: OperationDto;
  }> {
    const {
      strategy,
      lbfBullEvent,
      type,
      delayInMills,
      runType,
      payload = {},
    } = data;

    const operation = await this.operationService.createLbfStrategyOperation({
      type,
      runType,
      status: OPERATION_STATUS.PENDING,
      strategyId: strategy.id,
      blockchainId: strategy.blockchainId,
    });

    const queue = await this.strategiesQueuesService.getCoreQueue(strategy);

    const job = await queue.add(
      lbfBullEvent,
      {
        operationId: operation.id,
        payload,
      },
      {
        delay: delayInMills ? delayInMills : 0,
      },
    );

    await this.operationService.setBullJobId(operation.id, job.id.toString());

    const updatedOperation = await this.operationService.findOneById(
      operation.id,
    );

    this.logger.debug({
      message: 'createOperationAndJob done',
      lbfBullEvent,
      delayInMills,
      operation: updatedOperation,
      payload,
      job,
    });

    return {
      operation: updatedOperation,
    };
  }

  async runOperationByRestApiCall(data: {
    strategyId: number;
    type: OPERATION_TYPE;
    lbfBullEvent: LBF_BULL_EVENTS;
    payload: {
      isNeedToRecreateAll?: boolean;
    };
  }): Promise<{
    msg: string;
    operation?: OperationDto;
  }> {
    const { strategyId, type, lbfBullEvent, payload = {} } = data;
    const inProgress = await this.operationService.getInProgressLbfOperation({
      strategyId,
    });
    const strategy = await this.strategiesService.getStrategyById(strategyId);

    if (inProgress) {
      this.rollbarLogger.error(
        new LogicException(ERROR_CODES.OPERATION_IN_PROGRESS_EXIST),
        'runOperationByRestApiCall',
        {
          error: ERROR_CODES.OPERATION_IN_PROGRESS_EXIST,
          inWorkLbfOperation: inProgress,
        },
      );

      return {
        msg: 'Error, already in progress. Please try again later.',
        operation: inProgress,
      };
    }

    const inPending = await this.operationService.getInPendingLbfOperation({
      type,
      strategyId,
    });

    const queue = await this.strategiesQueuesService.getCoreQueue(strategy);

    if (inPending) {
      const { bullJobId, id } = inPending;
      let job = null;

      if (bullJobId) {
        job = await queue.getJob(bullJobId);

        if (job) {
          await job.remove();
        }
      }

      job = await queue.add(
        lbfBullEvent,
        {
          operationId: id,
          payload,
        },
        {
          delay: 0,
        },
      );

      await this.operationService.setBullJobId(id, job.id);

      return {
        msg: 'Success, operation will be launched now',
        operation: inPending,
      };
    }

    const { operation } = await this.createOperationAndJob({
      strategy,
      runType: OPERATION_RUN_TYPE.API,
      type,
      lbfBullEvent,
      payload,
    });

    return {
      msg: `Success, operation ${type} will be launched now`,
      operation,
    };
  }

  async executeLowRiskStrategy(
    strategyId: number,
    takeTokens: boolean,
    createPairs: boolean,
    isNeedToRecreateAll: boolean,
    uid: string,
  ): Promise<void> {
    this.logger.debug({
      message: 'executing executeLowRiskStrategy',
      isNeedToRecreateAll,
      uid,
    });

    const strategy = await this.strategiesService.getStrategyById(strategyId);

    if (!strategy) {
      throw new LogicException(ERROR_CODES.NOT_FOUND_STRATEGY);
    }

    const settings = strategy.settings as LandBorrowFarmSettingsDto;

    const { operationsPrivateKeyId, storageContractId, logicContractId } =
      strategy;

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

    const { isActive } = strategy;

    const { items: strategyPairs } =
      await this.strategiesService.getStrategPairsByStrId(strategyId, {
        order: ORDER.DESC,
        orderField: 'createdAt',
        page: 1,
        take: 100,
      });

    for (const item of strategyPairs) {
      await this.checkFarm({
        farm: item.pair.farm,
        settings,
        logicContract,
        storageContract,
        web3: operationsWeb3,
      });
    }

    if (!isActive) {
      throw new LogicException(ERROR_CODES.INACTIVE_STRATEGY);
    }

    const farmsWithPercentage: Array<{ farm: Farm; percentage: number }> = [];

    for (const item of strategyPairs) {
      farmsWithPercentage.push({
        farm: item.pair.farm,
        percentage: item.percentage,
      });
    }

    // перенос из storage в logic и отправляем на venus
    if (takeTokens) {
      await this.bolidLibService.takeTokensFromStorageAll({
        uid,
        logicContract,
        storageContract,
        settings,
        web3: operationsWeb3,
      });
    }

    // запусить создание пар
    if (createPairs) {
      await this.bolidLibService.runCreatePairs({
        farmsWithPercentage,
        isNeedToRecreateAll,
        uid,
        logicContract,
        storageContract,
        web3: operationsWeb3,
        strategyId,
        isTransactionProdMode: settings.isTransactionProdMode,
      });
    }
  }

  async getQuantityTokensInBlock(strategyId: number): Promise<number> {
    const strategy = await this.strategiesService.getStrategyById(strategyId);

    const settings = strategy.settings as LandBorrowFarmSettingsDto;

    return settings.quantityTokensInBlock;
  }
}
