export interface FetchedVenusToken {
  asset: string;
  vAddress: string;
  borrowBalance: number;
  vtokenBalance: number;
}

export interface FetchedVenusType {
  venusTokens: FetchedVenusToken[];
  totalBorrowLimit: number;
  supplyUSD: number;
  borrowUSD: number;
  percentLimit: number;
}
