import { ApiProperty } from '@nestjs/swagger';
import { IsArray } from 'class-validator';
import type { STRATEGY_TYPES } from 'src/common/constants/strategy-types';

export class TvlDto {
  @ApiProperty()
  farmingTvl: number;

  @ApiProperty()
  stakingTvl: number;

  @ApiProperty()
  @IsArray()
  strategiesTvl: StrategyTvl[];

  @ApiProperty()
  total: number;
}

export interface StrategyTvl {
  strategyId: number;
  type: STRATEGY_TYPES;
  name: string;
  totalStrategyTvl: number;
  tokensTvl: Record<string, { address: string; tvl: number }>;
}
