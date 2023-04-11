import { ApiProperty } from '@nestjs/swagger';
import { PageMetaDto } from 'src/common/dto/PageMetaDto';

import { TransactionDto } from './TransactionDto';

export class TransactionsPageDto {
  @ApiProperty({
    type: TransactionDto,
    isArray: true,
  })
  readonly items: TransactionDto[];

  @ApiProperty()
  readonly meta: PageMetaDto;

  constructor(items: TransactionDto[], meta: PageMetaDto) {
    this.items = items;
    this.meta = meta;
  }
}
