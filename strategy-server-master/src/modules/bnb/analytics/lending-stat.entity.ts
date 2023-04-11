import { AbstractEntity } from 'src/common/abstract.entity';
import { PLATFORMS } from 'src/common/constants/platforms';
import { Column, Entity } from 'typeorm';

import { LendingStatDto } from './dto/LendingStatDto';

@Entity({ name: 'lending_stats' })
export class LendingStatEntity extends AbstractEntity<LendingStatDto> {
  @Column({
    type: 'enum',
    enum: PLATFORMS,
    enumName: 'platform_enum',
  })
  platform: PLATFORMS;

  @Column({ type: 'decimal', nullable: true, default: null })
  totalBorrows: string;

  @Column({ type: 'decimal', nullable: true, default: null })
  totalBorrowsUsd: string;

  @Column({ type: 'decimal', nullable: true, default: null })
  totalSupply: string;

  @Column({ type: 'decimal', nullable: true, default: null })
  totalSupplyUsd: string;

  @Column({ type: 'decimal', nullable: true, default: null })
  collateralFactor: string;

  @Column({ type: 'decimal', nullable: true, default: null })
  borrowApy: string;

  @Column({ type: 'decimal', nullable: true, default: null })
  supplyApy: string;

  @Column({ type: 'decimal', nullable: true, default: null })
  borrowVenusApy: string;

  @Column({ type: 'decimal', nullable: true, default: null })
  supplyVenusApy: string;

  @Column({ type: 'decimal', nullable: true, default: null })
  liquidity: string;

  @Column({ type: 'decimal', nullable: true, default: null })
  tokenPrice: string;

  @Column({ nullable: true })
  borrowerCount: number;

  @Column({ nullable: true })
  supplierCount: number;

  @Column({ nullable: true })
  platformAddress: string;

  @Column({ nullable: true })
  platformSymbol: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  token: string;

  dtoClass = LendingStatDto;
}
