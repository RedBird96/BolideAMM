import { ApiProperty } from '@nestjs/swagger';

export class StatItemDto {
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
}
