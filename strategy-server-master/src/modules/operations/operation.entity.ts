import { AbstractUUIDEntity } from 'src/common/abstract-uuid.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

import { BlockchainEntity } from '../blockchains/blockchain.entity';
import { TransactionEntity } from '../bnb/transaction.entity';
import { StrategyEntity } from '../strategies/strategy.entity';
import { OperationDto } from './dto/OperationDto';
import { OperationMeta } from './interfaces/operation-meta.interface';

// eslint-disable-next-line @typescript-eslint/naming-convention
export enum OPERATION_STATUS {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  FAILED_SHUTDOWN = 'FAILED_SHUTDOWN',
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export enum OPERATION_TYPE {
  STRATEGY_RUN = 'STRATEGY_RUN',
  CLAIM_RUN = 'CLAIM_RUN',
  VENUS_CLAIM_RUN = 'VENUS_CLAIM_RUN',
  WITHDRAW_ALL_TO_STORAGE = 'WITHDRAW_ALL_TO_STORAGE',
  RECREATE_RESERVES = 'RECREATE_RESERVES',
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export enum OPERATION_RUN_TYPE {
  API = 'API',
  JOB = 'JOB',
}

@Entity({ name: 'operations' })
export class OperationEntity extends AbstractUUIDEntity<OperationDto> {
  @Column({
    type: 'enum',
    enum: OPERATION_STATUS,
    default: OPERATION_STATUS.PENDING,
  })
  status: OPERATION_STATUS;

  @ManyToOne(() => BlockchainEntity)
  @JoinColumn({ name: 'blockchain_id' })
  blockchain: BlockchainEntity;

  @Column({ name: 'blockchain_id' })
  blockchainId: number;

  @ManyToOne(() => StrategyEntity)
  @JoinColumn({ name: 'strategy_id' })
  strategy: StrategyEntity;

  @OneToMany(() => TransactionEntity, (transaction) => transaction.operation)
  transactions: TransactionEntity[];

  @Column({ name: 'strategy_id' })
  strategyId: number;

  @Column({ nullable: true })
  pid: number;

  @Column({ nullable: true })
  bullJobId: string;

  @Column({
    type: 'enum',
    enum: OPERATION_TYPE,
    nullable: true,
  })
  type: OPERATION_TYPE;

  @Column({
    type: 'enum',
    enum: OPERATION_RUN_TYPE,
    nullable: true,
  })
  runType: OPERATION_RUN_TYPE;

  @Column({ type: 'jsonb', default: {}, nullable: true })
  meta: OperationMeta;

  dtoClass = OperationDto;
}
