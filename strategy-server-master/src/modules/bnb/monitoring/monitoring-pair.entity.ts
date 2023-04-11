import { AbstractEntity } from 'src/common/abstract.entity';
import { Column, Entity } from 'typeorm';

import { MonitoringPairDto } from '../dto/MonitoringPairDto';

@Entity({ name: 'monitoring_pairs' })
export class MonitoringPairEntity extends AbstractEntity<MonitoringPairDto> {
  @Column()
  pairId: number;

  @Column({ type: 'decimal' })
  token1Price: string;

  @Column({ type: 'decimal' })
  token2Price: string;

  @Column({ type: 'decimal' })
  ratio: string;

  @Column({ type: 'decimal' })
  oldRatio: string;

  dtoClass = MonitoringPairDto;
}
