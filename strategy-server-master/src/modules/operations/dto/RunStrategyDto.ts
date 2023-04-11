import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

import { OperationDto } from './OperationDto';

export class RunStrategyDto {
  @ApiProperty()
  msg: string;

  @ApiPropertyOptional({ type: OperationDto })
  @IsOptional()
  operation?: OperationDto;
}
