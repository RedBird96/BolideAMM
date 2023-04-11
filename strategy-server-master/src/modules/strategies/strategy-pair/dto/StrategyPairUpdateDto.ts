import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber } from 'class-validator';

export class StrategyPairUpdateDto {
  @ApiProperty()
  @IsInt()
  newPairId: number;

  @ApiProperty()
  @IsNumber()
  percentage: number;
}
