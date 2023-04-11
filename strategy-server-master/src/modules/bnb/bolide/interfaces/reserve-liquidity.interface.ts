export interface ReserveLiquidity {
  tokenA: string;
  tokenB: string;
  vTokenA: string;
  vTokenB: string;
  swap: string;
  swapMaster: string;
  lpToken: string;
  poolID: number;
  path: string[][];
}
