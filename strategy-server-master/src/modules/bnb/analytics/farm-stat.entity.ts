import { AbstractEntity } from 'src/common/abstract.entity';
import { Column, Entity } from 'typeorm';

import { FarmStatDto } from './dto/FarmStatDto';

@Entity({ name: 'farm_stats' })
export class FarmStatEntity extends AbstractEntity<FarmStatDto> {
  @Column()
  token1: string;

  @Column()
  token2: string;

  @Column()
  market: string;

  @Column()
  pair: string;

  @Column()
  lpAddress: string;

  @Column({ type: 'decimal', nullable: true, default: null })
  apr: string;

  @Column({ type: 'decimal', nullable: true, default: null })
  poolLiquidityUsd: string;

  @Column({ type: 'decimal', nullable: true, default: null })
  poolWeight: string;

  @Column({ type: 'decimal', nullable: true, default: null })
  lpPrice: string;

  @Column({ type: 'decimal', nullable: true, default: null })
  token1Liquidity: string;

  @Column({ type: 'decimal', nullable: true, default: null })
  token1Price: string;

  @Column({ type: 'decimal', nullable: true, default: null })
  token2Liquidity: string;

  @Column({ type: 'decimal', nullable: true, default: null })
  token2Price: string;

  @Column({ type: 'decimal', nullable: true, default: null })
  totalSupply: string;

  dtoClass = FarmStatDto;
}
