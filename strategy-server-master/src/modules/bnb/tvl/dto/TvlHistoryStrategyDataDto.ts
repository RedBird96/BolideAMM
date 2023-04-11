export class TvlHistoryStrategyDataDto {
  strategyId: number;

  contractAddress: string;

  totalStrategyTvl: number;

  tokensTvl: Record<string, { address: string; tvl: number }>;
}
