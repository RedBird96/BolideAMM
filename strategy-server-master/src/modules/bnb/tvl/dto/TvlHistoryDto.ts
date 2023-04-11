import { ApiProperty } from '@nestjs/swagger';
import { AbstractDto } from 'src/common/dto/AbstractDto';

import type { TvlHistoryEntity } from '../tvl-history.entity';
import type { TvlHistoryStrategyDataDto } from './TvlHistoryStrategyDataDto';

export class TvlHistoryDto extends AbstractDto {
  @ApiProperty()
  date: Date;

  @ApiProperty()
  farmingTvl: number;

  @ApiProperty()
  stakingTvl: number;

  @ApiProperty()
  strategiesTvlData: TvlHistoryStrategyDataDto[];

  @ApiProperty()
  totalTvl: number;

  constructor(data: TvlHistoryEntity) {
    super(data);

    this.date = data.date;
    this.farmingTvl = data.farmingTvl;
    this.stakingTvl = data.stakingTvl;
    this.strategiesTvlData = data.strategiesTvlData;
    this.totalTvl = data.totalTvl;
  }
}
