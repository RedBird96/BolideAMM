import { ApiProperty } from '@nestjs/swagger';
import { AbstractDto } from 'src/common/dto/AbstractDto';

import { StakedPortfolio } from '../lbf-analytics.service';
import type { LbfStatEntity } from '../lbf-stat.entity';

export class LbfStatDto extends AbstractDto {
  @ApiProperty()
  strategyId: number;

  @ApiProperty()
  amount: string;

  @ApiProperty()
  venusEarnAmount: string;

  @ApiProperty()
  farmingAmount: string;

  @ApiProperty()
  lendedAmount: string;

  @ApiProperty()
  borrowVsStakedAmount: string;

  @ApiProperty()
  borrowedAmount: string;

  @ApiProperty()
  stakedAmount: string;

  @ApiProperty()
  walletAmount: string;

  @ApiProperty()
  venusPercentLimit: string;

  @ApiProperty()
  walletInfo: Record<string, string>;

  @ApiProperty()
  farmingEarns: Record<string, string>;

  @ApiProperty()
  lendedTokens: Record<
    string,
    {
      diff: string;
      vTokenBalance: string;
    }
  >;

  @ApiProperty()
  borrowed: Record<string, string>;

  @ApiProperty()
  staked: Record<string, string>;

  @ApiProperty()
  borrowVsStaked: Record<string, number>;

  @ApiProperty()
  stakedPortfolio: StakedPortfolio;

  @ApiProperty()
  lendedTotal: string;

  constructor(data: LbfStatEntity) {
    super(data);

    this.strategyId = data.strategyId;

    this.amount = data.amount;
    this.venusEarnAmount = data.venusEarnAmount;
    this.farmingAmount = data.farmingAmount;
    this.lendedAmount = data.lendedAmount;
    this.borrowVsStakedAmount = data.borrowVsStakedAmount;
    this.borrowedAmount = data.borrowedAmount;
    this.stakedAmount = data.stakedAmount;
    this.walletAmount = data.walletAmount;
    this.venusPercentLimit = data.venusPercentLimit;

    this.walletInfo = data.walletInfo;
    this.farmingEarns = data.farmingEarns;
    this.lendedTokens = data.lendedTokens;
    this.borrowed = data.borrowed;
    this.staked = data.staked;
    this.borrowVsStaked = data.borrowVsStaked;

    this.stakedPortfolio = data.stakedPortfolio;
    this.lendedTotal = data.lendedTotal;
  }
}
