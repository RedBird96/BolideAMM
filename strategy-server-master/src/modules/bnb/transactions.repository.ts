import { omit } from 'lodash';
import { ORDER } from 'src/common/constants/order';
import { PageMetaDto } from 'src/common/dto/PageMetaDto';
import { getSkip } from 'src/common/utils/get-skip';
import { Repository } from 'typeorm';
import { EntityRepository } from 'typeorm/decorator/EntityRepository';

import { TransactionsByUidDto } from './dto/TransactionsByUidDto';
import { TransactionsPageDto } from './dto/TransactionsPageDto';
import type { TransactionsPageOptionsDto } from './dto/TransactionsPageOptionsDto';
import type { BlockchainTransactionRaw } from './interfaces/blockchain-transaction-raw.interface';
import type { TransactionMeta } from './interfaces/transaction-meta.iterface';
import { TransactionEntity } from './transaction.entity';

@EntityRepository(TransactionEntity)
export class TransactionsRepository extends Repository<TransactionEntity> {
  async saveTransaction(data: {
    meta: TransactionMeta;
    method: string;
    uid: string;
    func: string;
    hash: string;
    transactionRaw: BlockchainTransactionRaw;
  }): Promise<TransactionEntity> {
    return this.save(data);
  }

  async getTransactionsByUid(uid: string): Promise<TransactionsByUidDto> {
    const queryBuilder = this.createQueryBuilder('transaction');

    const where: any = {
      uid,
    };

    const orderBy: any = {};
    const order = ORDER.DESC;

    orderBy['transaction.id'] = order;

    queryBuilder.where(where);

    const transactions = await queryBuilder
      .orderBy(orderBy)
      .take(1000)
      .getMany();

    const dtos = [];

    for (const item of transactions) {
      dtos.push(item.toDto());
    }

    return new TransactionsByUidDto(dtos);
  }

  async getItems(
    pageOptionsDto: TransactionsPageOptionsDto,
  ): Promise<TransactionsPageDto> {
    const queryBuilder = this.createQueryBuilder('transaction');

    const where: any = omit(pageOptionsDto, [
      'skip',
      'take',
      'order',
      'page',
      'orderField',
      'search',
      'roles',
      'operationsIds',
    ]);

    const {
      order = ORDER.DESC,
      orderField = 'id',
      page,
      take,
      operationsIds,
    } = pageOptionsDto;

    const orderBy: any = {};

    orderBy[`transaction.${orderField}`] = order;

    queryBuilder.where(where);

    if (operationsIds?.length) {
      queryBuilder.andWhere('transaction.uid IN (:...operationsIds)', {
        operationsIds,
      });
    }

    const [transactions, transactionsCount] = await queryBuilder
      .orderBy(orderBy)
      .skip(getSkip(page, take))
      .take(take)
      .getManyAndCount();

    const pageMetaDto = new PageMetaDto({
      pageOptionsDto,
      itemCount: transactionsCount,
    });

    const dtos = [];

    for (const item of transactions) {
      dtos.push(item.toDto());
    }

    return new TransactionsPageDto(dtos, pageMetaDto);
  }
}
