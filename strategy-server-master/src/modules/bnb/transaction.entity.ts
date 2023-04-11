import { AbstractEntity } from 'src/common/abstract.entity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { OperationEntity } from '../operations/operation.entity';
import { TransactionDto } from './dto/TransactionDto';
import { BlockchainTransactionRaw } from './interfaces/blockchain-transaction-raw.interface';
import { TransactionMeta } from './interfaces/transaction-meta.iterface';

@Entity({ name: 'transactions' })
export class TransactionEntity extends AbstractEntity<TransactionDto> {
  @Column({ type: 'uuid' })
  uid: string;

  @ManyToOne(() => OperationEntity)
  @JoinColumn({ name: 'uid' })
  operation: OperationEntity;

  @Column({ type: 'jsonb', default: {}, nullable: true })
  meta: TransactionMeta;

  @Column({ nullable: true })
  method: string;

  @Column({ nullable: true })
  func: string;

  @Column({ nullable: true })
  hash: string;

  @Column({ type: 'jsonb', default: {}, nullable: true })
  transactionRaw: BlockchainTransactionRaw;

  dtoClass = TransactionDto;
}
