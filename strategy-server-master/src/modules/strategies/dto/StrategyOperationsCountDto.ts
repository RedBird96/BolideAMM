import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class StrategyOperationsCountDto {
  @IsNumber()
  @ApiProperty()
  count: number;
}
