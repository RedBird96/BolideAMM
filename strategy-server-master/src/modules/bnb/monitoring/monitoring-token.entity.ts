import { AbstractEntity } from 'src/common/abstract.entity';
import { Column, Entity } from 'typeorm';

import { MonitoringTokenDto } from '../dto/MonitoringTokenDto';

@Entity({ name: 'monitoring_tokens' })
export class MonitoringTokenEntity extends AbstractEntity<MonitoringTokenDto> {
  @Column()
  market: string;

  @Column()
  token: string;

  @Column({ type: 'decimal' })
  price: string;

  @Column({ type: 'decimal', nullable: true, default: null })
  dexPrice: string;

  dtoClass = MonitoringTokenDto;
}
