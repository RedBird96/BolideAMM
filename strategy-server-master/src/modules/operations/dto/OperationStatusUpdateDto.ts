import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

import { OPERATION_STATUS } from '../operation.entity';

export class OperationStatusUpdateDto {
  @ApiProperty({ enum: OPERATION_STATUS })
  @IsEnum(OPERATION_STATUS)
  status: OPERATION_STATUS;
}
