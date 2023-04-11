import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class StrategyStorageReserveDto {
  @IsNumber()
  @ApiProperty()
  maxAmountUsd: number;

  @IsNumber()
  @ApiProperty()
  percentToPreserve: number;
}
