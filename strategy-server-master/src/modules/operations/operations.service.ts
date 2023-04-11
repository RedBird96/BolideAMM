import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DateTime } from 'luxon';
import { ERROR_CODES } from 'src/common/constants/error-codes';
import { LogicException } from 'src/common/logic.exception';
import { fromWei, fromWeiToStr, toBN } from 'src/common/utils/big-number-utils';
import { BnbUtilsService } from 'src/modules/bnb/bnb-utils.service';
import { UniswapEthService } from 'src/modules/bnb/uniswap/uniswap-eth.service';
import type { FindConditions, UpdateResult } from 'typeorm';
import { In } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import type Web3 from 'web3';

import type { WalletBalances } from '../bnb/balance.service';
import { TransactionsService } from '../bnb/transactions.service';
import type { OperationDto } from './dto/OperationDto';
import type { OperationsListDto } from './dto/OperationsListDto';
import type { OperationsListOptionsDto } from './dto/OperationsListOptionsDto';
import type {
  OperationClaimPayload,
  OperationMeta,
} from './interfaces/operation-meta.interface';
import type {
  OPERATION_RUN_TYPE,
  OPERATION_TYPE,
  OperationEntity,
} from './operation.entity';
import { OPERATION_STATUS } from './operation.entity';
import { OperationsRepository } from './operations.repository';

@Injectable()
export class OperationsService {
  private readonly logger = new Logger(OperationsService.name);

  constructor(
    private readonly operationsRepository: OperationsRepository,
    private readonly transactionsService: TransactionsService,
    private readonly bnbUtilsService: BnbUtilsService,
    private readonly uniswapEthService: UniswapEthService,
  ) {}

  @Cron(CronExpression.EVERY_WEEK)
  async clearOperations() {
    const earlyThen = DateTime.now().plus({ weeks: -4 }).toJSDate();
    await this.operationsRepository.clearOrphanedOperations(earlyThen);
  }

  async createLbfStrategyOperation(data: {
    type: OPERATION_TYPE;
    runType: OPERATION_RUN_TYPE;
    blockchainId: number;
    strategyId: number;
    status?: OPERATION_STATUS;
  }): Promise<OperationEntity> {
    const { type, status, strategyId } = data;

    const pid = process.pid;

    if (status === OPERATION_STATUS.IN_PROGRESS) {
      const inProgressLbfOperation = await this.getInProgressLbfOperation({
        strategyId,
      });

      if (inProgressLbfOperation) {
        throw new LogicException(ERROR_CODES.OPERATION_IN_PROGRESS_EXIST);
      }
    }

    const inPendingOperation = await this.getInPendingLbfOperation({
      type,
      strategyId,
    });

    if (inPendingOperation) {
      throw new LogicException(ERROR_CODES.OPERATION_IN_PENDING_EXIST);
    }

    const operation = {
      status: OPERATION_STATUS.PENDING,
      pid,
      meta: {},
      ...data,
    };

    return this.operationsRepository.saveOperation(operation);
  }

  async createClaimOperation(data: {
    type: OPERATION_TYPE;
    runType: OPERATION_RUN_TYPE;
    blockchainId: number;
    strategyId: number;
    status?: OPERATION_STATUS;
    meta?: OperationMeta;
  }): Promise<OperationEntity> {
    const pid = process.pid;

    const operation = {
      status: OPERATION_STATUS.IN_PROGRESS,
      pid,
      meta: {},
      ...data,
    };

    return this.operationsRepository.saveOperation(operation);
  }

  async inProgressOperation(data: {
    id: string;
    adminBalanceBefore?: WalletBalances;
    boostBalanceBefore?: WalletBalances;
    meta?: OperationMeta;
  }): Promise<UpdateResult> {
    const { id, adminBalanceBefore, boostBalanceBefore, meta = {} } = data;

    return this.operationsRepository.update(
      {
        id,
      },
      {
        meta: {
          ...meta,
          adminBalanceBefore,
          boostBalanceBefore,
        },
        status: OPERATION_STATUS.IN_PROGRESS,
      },
    );
  }

  async setBullJobId(id: string, bullJobId: string): Promise<UpdateResult> {
    return this.operationsRepository.update(
      {
        id,
      },
      {
        bullJobId,
      },
    );
  }

  async failOperation(
    id: string,
    status: OPERATION_STATUS.FAILED | OPERATION_STATUS.FAILED_SHUTDOWN,
  ): Promise<UpdateResult> {
    return this.operationsRepository.update(
      {
        id,
      },
      {
        status,
      },
    );
  }

  async succeedOperation(data: {
    id: string;
    metaToSave: {
      adminBalanceAfter?: WalletBalances;
      boostBalanceAfter?: WalletBalances;
      payload?: OperationClaimPayload;
    };
    meta?: OperationMeta;
  }) {
    const { id, metaToSave, meta } = data;

    return this.operationsRepository.update(
      {
        id,
      },
      {
        status: OPERATION_STATUS.SUCCESS,
        meta: { ...meta, ...metaToSave },
      },
    );
  }

  async getOperations(
    pageOptionsDto: OperationsListOptionsDto,
  ): Promise<OperationsListDto> {
    const operationsList = await this.operationsRepository.getItems(
      pageOptionsDto,
    );
    const results = [];

    for (const operation of operationsList.items) {
      const transactionCount =
        await this.transactionsService.getCountByOperationId(operation.id);

      results.push({
        ...operation,
        transactionCount,
      });
    }

    return {
      ...operationsList,
      items: results,
    };
  }

  async getOperationGasUsed(data: {
    operationId: string;
    web3: Web3;
  }): Promise<{
    gasUsed: {
      ethers: string;
      usd: string;
    };
  }> {
    const { operationId, web3 } = data;

    try {
      const DEFAULT_GAS_PRICE = await this.bnbUtilsService.getGasPrice(web3);
      const ETHER_USD_PRICE = await this.uniswapEthService.getEtherPrice(web3);

      const transactionList =
        await this.transactionsService.getTransactionsByUid(operationId);

      // eslint-disable-next-line unicorn/no-array-reduce
      const gasUsedWei = transactionList.items.reduce((prev, curr) => {
        const gas = curr.meta?.gasUsed ? toBN(curr.meta?.gasUsed) : toBN(0);
        const gasPrice = curr.meta?.gasPrice
          ? toBN(curr.meta?.gasPrice)
          : DEFAULT_GAS_PRICE;

        return gasPrice.mul(gas).add(prev);
      }, toBN(0));

      return {
        gasUsed: {
          ethers: fromWeiToStr(gasUsedWei),
          usd: fromWeiToStr(gasUsedWei.mul(fromWei(ETHER_USD_PRICE))),
        },
      };
    } catch (error) {
      this.logger.error({
        message: 'getOperationGasUsed',
        error,
        operationId,
      });

      return {
        gasUsed: {
          ethers: null,
          usd: null,
        },
      };
    }
  }

  async getLastClaimGtZeroLog(data: {
    strategyId: number;
  }): Promise<OperationDto> {
    const entity = await this.operationsRepository.getLastClaimGtZeroLog(data);

    return entity ? entity.toDto() : null;
  }

  async getLastStrategyOperationLog(strategyId): Promise<OperationDto> {
    const entity = await this.operationsRepository.getLastStrategyOperationLog(
      strategyId,
    );

    return entity ? entity.toDto() : null;
  }

  async getAllInProgressOperations(): Promise<OperationEntity[]> {
    return this.operationsRepository.find({
      status: OPERATION_STATUS.IN_PROGRESS,
    });
  }

  async getAllProgressAndPendingOperations(
    strategyId,
  ): Promise<OperationEntity[]> {
    return this.operationsRepository.find({
      strategyId,
      status: In([OPERATION_STATUS.IN_PROGRESS, OPERATION_STATUS.PENDING]),
    });
  }

  async getInProgressLbfOperation(data: {
    strategyId: number;
  }): Promise<OperationDto> {
    const { strategyId } = data;

    const entity = await this.operationsRepository.getLbfOperationByStatus({
      status: OPERATION_STATUS.IN_PROGRESS,
      strategyId,
    });

    return entity ? entity.toDto() : null;
  }

  async getInPendingLbfOperation(data: {
    type: OPERATION_TYPE;
    strategyId: number;
  }): Promise<OperationDto> {
    const { type, strategyId } = data;

    const entity = await this.operationsRepository.findOne({
      strategyId,
      status: OPERATION_STATUS.PENDING,
      type,
    });

    return entity ? entity.toDto() : null;
  }

  async getIdsByBlockchainId(blockchainId: number): Promise<string[]> {
    return this.operationsRepository.getIdsByBlockchainId(blockchainId);
  }

  async findOneById(operationId: string): Promise<OperationDto> {
    const entity = await this.operationsRepository.findOne({
      id: operationId,
    });

    return entity ? entity.toDto() : null;
  }

  async findByStrategy(strategyId: number): Promise<OperationDto[]> {
    const entities = await this.operationsRepository.find({
      strategyId,
    });

    return entities.map((entity) => entity.toDto());
  }

  async getCountByStrategyId(strategyId: number): Promise<{
    count: number;
  }> {
    const count = await this.operationsRepository.count({
      strategyId,
    });

    return { count };
  }

  async updateOperationStatus(
    operationId: string,
    status: OPERATION_STATUS,
  ): Promise<UpdateResult> {
    return this.operationsRepository.update(
      {
        id: operationId,
      },
      {
        status,
      },
    );
  }

  async update(
    where: FindConditions<OperationEntity>,
    data: QueryDeepPartialEntity<OperationEntity>,
  ): Promise<UpdateResult> {
    return this.operationsRepository.update(where, data);
  }
}
