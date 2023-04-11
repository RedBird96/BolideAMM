import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber } from 'class-validator';

export class StrategyPairAddDto {
  @ApiProperty()
  @IsInt()
  pairId: number;

  @ApiProperty()
  @IsNumber()
  percentage: number;
}
