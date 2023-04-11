import { AbstractEntity } from 'src/common/abstract.entity';
import { Column, Entity } from 'typeorm';

import { TvlHistoryDto } from './dto/TvlHistoryDto';
import type { TvlHistoryStrategyDataDto } from './dto/TvlHistoryStrategyDataDto';

@Entity({ name: 'tvl_history' })
export class TvlHistoryEntity extends AbstractEntity<TvlHistoryDto> {
  @Column({
    type: 'timestamp without time zone',
    name: 'date',
  })
  date: Date;

  @Column({ name: 'blockchain_id' })
  blockchainId: number;

  @Column({ type: 'decimal', nullable: true, default: null })
  farmingTvl: number;

  @Column({ type: 'decimal', nullable: true, default: null })
  stakingTvl: number;

  @Column({ type: 'jsonb' })
  strategiesTvlData: TvlHistoryStrategyDataDto[];

  @Column({ type: 'decimal' })
  totalTvl: number;

  dtoClass = TvlHistoryDto;
}
