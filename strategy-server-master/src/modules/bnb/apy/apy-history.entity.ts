import { AbstractEntity } from 'src/common/abstract.entity';
import { Column, Entity } from 'typeorm';

import { ApyHistoryDto } from './dto/ApyHistoryDto';
import type { ApyHistoryStrategyDataDto } from './dto/ApyHistoryStrategyDataDto';

@Entity({ name: 'apy_history' })
export class ApyHistoryEntity extends AbstractEntity<ApyHistoryDto> {
  @Column({
    type: 'timestamp without time zone',
    name: 'date',
  })
  date: Date;

  @Column({ name: 'blockchain_id' })
  blockchainId: number;

  @Column({ type: 'decimal', nullable: true, default: null })
  farmingApy: number;

  @Column({ type: 'decimal', nullable: true, default: null })
  stakingApy: number;

  @Column({ type: 'jsonb' })
  strategiesApyData: ApyHistoryStrategyDataDto[];

  dtoClass = ApyHistoryDto;
}
