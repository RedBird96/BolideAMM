import { ApiProperty } from '@nestjs/swagger';
import { AbstractDto } from 'src/common/dto/AbstractDto';

import { BlockchainTransactionRaw } from '../interfaces/blockchain-transaction-raw.interface';
import { TransactionMeta } from '../interfaces/transaction-meta.iterface';
import type { TransactionEntity } from '../transaction.entity';

export class TransactionDto extends AbstractDto {
  @ApiProperty()
  uid: string;

  @ApiProperty()
  meta: TransactionMeta;

  @ApiProperty()
  method: string;

  @ApiProperty()
  func: string;

  @ApiProperty()
  hash: string;

  @ApiProperty()
  transactionRaw: BlockchainTransactionRaw;

  constructor(data: TransactionEntity) {
    super(data);

    this.uid = data.uid;
    this.meta = data.meta;
    this.method = data.method;
    this.func = data.func;
    this.hash = data.hash;
    this.transactionRaw = data.transactionRaw;
  }
}
