import { ApiProperty } from '@nestjs/swagger';

export class StrategyBalancesDto {
  @ApiProperty()
  tokens: Record<string, number>;

  @ApiProperty()
  borrowed: Record<string, number>;

  @ApiProperty()
  staked: Record<string, number>;

  @ApiProperty()
  lps: Record<string, number>;

  @ApiProperty()
  lended: Record<string, number>;
}
