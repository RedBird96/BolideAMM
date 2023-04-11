import { ApiProperty } from '@nestjs/swagger';
import { IsArray } from 'class-validator';
import type { STRATEGY_TYPES } from 'src/common/constants/strategy-types';

export class ApyDto {
  @ApiProperty()
  farmingApy: number;

  @ApiProperty()
  stakingApy: number;

  @ApiProperty()
  @IsArray()
  strategiesApy: Array<{
    id: number;
    type: STRATEGY_TYPES;
    name: string;
    apy: number;
  }>;
}
