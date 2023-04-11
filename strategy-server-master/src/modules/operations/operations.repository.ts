import { omit } from 'lodash';
import { ORDER } from 'src/common/constants/order';
import { PageMetaDto } from 'src/common/dto/PageMetaDto';
import { getSkip } from 'src/common/utils/get-skip';
import { Any, LessThan, Repository } from 'typeorm';
import { EntityRepository } from 'typeorm/decorator/EntityRepository';

import { TransactionEntity } from '../bnb/transaction.entity';
import { OperationsListDto } from './dto/OperationsListDto';
import type { OperationsListOptionsDto } from './dto/OperationsListOptionsDto';
import type { OPERATION_RUN_TYPE } from './operation.entity';
import {
  OPERATION_STATUS,
  OPERATION_TYPE,
  OperationEntity,
} from './operation.entity';

@EntityRepository(OperationEntity)
export class OperationsRepository extends Repository<OperationEntity> {
  async saveOperation(data: {
    status: OPERATION_STATUS;
    type: OPERATION_TYPE;
    runType: OPERATION_RUN_TYPE;
  }): Promise<OperationEntity> {
    return this.save(data);
  }

  async getItems(
    pageOptionsDto: OperationsListOptionsDto,
  ): Promise<OperationsListDto> {
    const queryBuilder = this.createQueryBuilder('operation');

    const where: any = omit(pageOptionsDto, [
      'skip',
      'take',
      'order',
      'page',
      'orderField',
      'search',
      'roles',
      'isTransactionsExists',
    ]);

    const {
      order = ORDER.DESC,
      orderField = 'createdAt',
      page,
      take,
      isTransactionsExists,
    } = pageOptionsDto;

    if (isTransactionsExists) {
      queryBuilder.innerJoin(
        TransactionEntity,
        'transaction',
        'transaction.uid IS NOT NULL AND operation.id = transaction.uid',
      );
    }

    const orderBy: any = {};

    orderBy[`operation.${orderField}`] = order;

    queryBuilder.where(where);

    const [operations, operationsCount] = await queryBuilder
      .orderBy(orderBy)
      .skip(getSkip(page, take))
      .take(take)
      .getManyAndCount();

    const pageMetaDto = new PageMetaDto({
      pageOptionsDto,
      itemCount: operationsCount,
    });

    const dtos = [];

    for (const item of operations) {
      dtos.push(item.toDto());
    }

    return new OperationsListDto(dtos, pageMetaDto);
  }

  async getLastClaimGtZeroLog(data: {
    strategyId: number;
  }): Promise<OperationEntity> {
    const queryBuilder = this.createQueryBuilder('operation');

    // eslint-disable-next-line @typescript-eslint/naming-convention
    const orderBy = { 'operation.createdAt': ORDER.DESC };

    return queryBuilder
      .where({
        type: OPERATION_TYPE.CLAIM_RUN,
        status: OPERATION_STATUS.SUCCESS,
        strategyId: data.strategyId,
      })
      .andWhere(
        "coalesce(operation.meta->'payload'->>'earnUsd', '0')::DECIMAL > 0",
      )
      .orderBy(orderBy)
      .getOne();
  }

  async getLastStrategyOperationLog(
    strategyId: number,
  ): Promise<OperationEntity> {
    const queryBuilder = this.createQueryBuilder('operation');

    // eslint-disable-next-line @typescript-eslint/naming-convention
    const orderBy = { 'operation.createdAt': ORDER.DESC };

    return queryBuilder
      .where({
        strategyId,
        type: OPERATION_TYPE.STRATEGY_RUN,
        status: Any([
          OPERATION_STATUS.SUCCESS,
          OPERATION_STATUS.FAILED,
          OPERATION_STATUS.FAILED_SHUTDOWN,
        ]),
      })
      .orderBy(orderBy)
      .getOne();
  }

  async getLbfOperationByStatus(where: {
    status: OPERATION_STATUS;
    strategyId: number;
  }): Promise<OperationEntity> {
    const queryBuilder = this.createQueryBuilder('operation');

    // eslint-disable-next-line @typescript-eslint/naming-convention
    const orderBy = { 'operation.createdAt': ORDER.DESC };

    return queryBuilder.where(where).orderBy(orderBy).getOne();
  }

  async clearOrphanedOperations(earlyThen: Date) {
    const queryBuilder = this.createQueryBuilder('operation');
    await queryBuilder
      .delete()
      .where(
        `NOT EXISTS ${queryBuilder
          .subQuery()
          .select('1')
          .from(TransactionEntity, 'transaction')
          .where(
            'transaction.uid IS NOT NULL AND operations.id = transaction.uid',
          )
          .getQuery()}`,
      )
      .andWhere({ createdAt: LessThan(earlyThen) })
      .execute();
  }

  async getIdsByBlockchainId(blockchainId: number): Promise<string[]> {
    const queryBuilder = this.createQueryBuilder('operation');

    const result: Array<{ operation_id: string }> = await queryBuilder
      .select('operation.id')
      .where('operation.blockchain_id = :blockchainId', { blockchainId })
      .getRawMany();

    return result.map((row) => row.operation_id);
  }
}
