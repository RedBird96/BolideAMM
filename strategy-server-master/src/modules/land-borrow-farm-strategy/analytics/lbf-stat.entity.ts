import { AbstractEntity } from 'src/common/abstract.entity';
import { StrategyEntity } from 'src/modules/strategies/strategy.entity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { LbfStatDto } from './dto/LbfStatDto';
import { StakedPortfolio } from './lbf-analytics.service';

@Entity({ name: 'lbf_stats' })
export class LbfStatEntity extends AbstractEntity<LbfStatDto> {
  @Column({ nullable: false })
  strategyId: number;

  @ManyToOne(() => StrategyEntity)
  @JoinColumn({ name: 'strategy_id' })
  strategy: StrategyEntity;

  @Column({ type: 'decimal', nullable: true, default: null })
  amount: string;

  @Column({ type: 'decimal', nullable: true, default: null })
  venusEarnAmount: string;

  @Column({ type: 'decimal', nullable: true, default: null })
  farmingAmount: string;

  @Column({ type: 'decimal', nullable: true, default: null })
  lendedAmount: string;

  @Column({ type: 'decimal', nullable: true, default: null })
  borrowVsStakedAmount: string;

  @Column({ type: 'decimal', nullable: true, default: null })
  borrowedAmount: string;

  @Column({ type: 'decimal', nullable: true, default: null })
  stakedAmount: string;

  @Column({ type: 'decimal', nullable: true, default: null })
  venusPercentLimit: string;

  @Column({ type: 'decimal', nullable: true, default: null })
  walletAmount: string;

  @Column({ type: 'jsonb', default: {}, nullable: true })
  walletInfo: Record<string, string>;

  @Column({ type: 'jsonb', default: {}, nullable: true })
  farmingEarns: Record<string, string>;

  @Column({ type: 'jsonb', default: {}, nullable: true })
  lendedTokens: Record<
    string,
    {
      diff: string;
      vTokenBalance: string;
    }
  >;

  @Column({ type: 'jsonb', default: {}, nullable: true })
  stakedPortfolio: StakedPortfolio;

  @Column({ type: 'decimal', nullable: true, default: null })
  lendedTotal: string;

  @Column({ type: 'jsonb', default: {}, nullable: true })
  borrowed: Record<string, string>;

  @Column({ type: 'jsonb', default: {}, nullable: true })
  staked: Record<string, string>;

  @Column({ type: 'jsonb', default: {}, nullable: true })
  borrowVsStaked: Record<string, number>;

  dtoClass = LbfStatDto;
}
