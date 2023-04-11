export interface IToken {
  name: string;
  address: string;
  pool: string;
  poolId: number;
}

export interface IChain {
  name: string;
  chainId: number;
  contract: string;
  feeLibrary: string;
  symbol: string;
}
