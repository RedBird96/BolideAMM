import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AbstractUUIDDto } from 'src/common/dto/AbstractUuidDto';

import { OperationMeta } from '../interfaces/operation-meta.interface';
import type { OperationEntity } from '../operation.entity';
import {
  OPERATION_RUN_TYPE,
  OPERATION_STATUS,
  OPERATION_TYPE,
} from '../operation.entity';

export class OperationDto extends AbstractUUIDDto {
  @ApiProperty()
  status: OPERATION_STATUS;

  @ApiProperty()
  blockchainId: number;

  @ApiProperty()
  strategyId: number;

  @ApiProperty()
  type: OPERATION_TYPE;

  @ApiProperty()
  runType: OPERATION_RUN_TYPE;

  @ApiProperty()
  meta: OperationMeta;

  @ApiProperty()
  pid: number;

  @ApiPropertyOptional()
  bullJobId: string;

  constructor(data: OperationEntity) {
    super(data);

    this.status = data.status;
    this.blockchainId = data.blockchainId;
    this.strategyId = data.strategyId;
    this.type = data.type;
    this.runType = data.runType;
    this.meta = data.meta;
    this.pid = data.pid;
    this.bullJobId = data.bullJobId;
  }
}
