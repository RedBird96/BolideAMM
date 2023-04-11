import { ApiProperty } from '@nestjs/swagger';

import { TransactionDto } from './TransactionDto';

export class TransactionsByUidDto {
  @ApiProperty({
    type: TransactionDto,
    isArray: true,
  })
  readonly items: TransactionDto[];

  constructor(items: TransactionDto[]) {
    this.items = items;
  }
}
