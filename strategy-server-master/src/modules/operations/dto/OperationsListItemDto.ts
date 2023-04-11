import { ApiProperty } from '@nestjs/swagger';

import type { OperationEntity } from '../operation.entity';
import { OperationDto } from './OperationDto';

interface GasUsed {
  ethers: string;
  usd: string;
}

interface AdditionalFields {
  transactionCount: number;
  gasUsed: GasUsed;
}

export class OperationsListItemDto extends OperationDto {
  @ApiProperty()
  transactionCount: number;

  @ApiProperty()
  gasUsed: GasUsed;

  constructor(data: OperationEntity & AdditionalFields) {
    const { transactionCount, gasUsed } = data;
    super(data);

    this.transactionCount = transactionCount;
    this.gasUsed = gasUsed;
  }
}
