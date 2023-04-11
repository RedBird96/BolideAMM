import { ApiProperty } from '@nestjs/swagger';

import { GasUsedDto } from './GasUsedDto';

export class OperationGasUsedDto {
  @ApiProperty({ type: GasUsedDto })
  gasUsed?: GasUsedDto;
}
