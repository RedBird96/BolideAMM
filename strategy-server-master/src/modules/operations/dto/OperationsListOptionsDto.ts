import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional } from 'class-validator';
import { PageOptionsDto } from 'src/common/dto/PageOptionsDto';

import { strToBool } from '../../../common/transform-fns/str-to-bool';
import { ToInt } from '../../../decorators/transforms.decorator';
import {
  OPERATION_RUN_TYPE,
  OPERATION_STATUS,
  OPERATION_TYPE,
} from '../operation.entity';

export class OperationsListOptionsDto extends PageOptionsDto {
  @ApiPropertyOptional({ enum: OPERATION_TYPE })
  @IsEnum(OPERATION_TYPE)
  @IsOptional()
  readonly type: OPERATION_TYPE;

  @ApiPropertyOptional({ enum: OPERATION_RUN_TYPE })
  @IsEnum(OPERATION_RUN_TYPE)
  @IsOptional()
  readonly runType: OPERATION_RUN_TYPE;

  @ApiPropertyOptional({ enum: OPERATION_STATUS })
  @IsEnum(OPERATION_STATUS)
  @IsOptional()
  readonly status: OPERATION_STATUS;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @ToInt()
  readonly blockchainId: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @ToInt()
  readonly strategyId: number;

  @ApiPropertyOptional()
  @Transform(strToBool)
  @IsOptional()
  readonly isTransactionsExists?: boolean;
}
