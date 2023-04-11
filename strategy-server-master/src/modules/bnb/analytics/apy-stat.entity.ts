import { AbstractEntity } from 'src/common/abstract.entity';
import { PLATFORMS } from 'src/common/constants/platforms';
import { Column, Entity } from 'typeorm';

import { ApyStatDto } from './dto/ApyStatDto';

@Entity({ name: 'apy_stats' })
export class ApyStatEntity extends AbstractEntity<ApyStatDto> {
  @Column({ nullable: true })
  strategyId?: number;

  @Column({
    type: 'enum',
    enum: PLATFORMS,
    enumName: 'platform_enum',
  })
  lendingPlatform: PLATFORMS;

  @Column()
  pair: string;

  @Column({
    type: 'enum',
    enum: PLATFORMS,
    enumName: 'platform_enum',
  })
  farmPlatform: PLATFORMS;

  @Column({ type: 'decimal', nullable: true, default: null })
  totalApy: string;

  @Column({ type: 'decimal', nullable: true, default: null })
  borrowTokensApy: string;

  @Column({ type: 'decimal', nullable: true, default: null })
  suppliedTokensApy: string;

  @Column({ type: 'decimal', nullable: true, default: null })
  farmApy: string;

  dtoClass = ApyStatDto;
}
