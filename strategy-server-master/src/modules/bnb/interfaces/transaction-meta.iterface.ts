export interface TransactionMeta {
  tokenA?: string;
  tokenB?: string;
  vTokenA?: string;
  vTokenB?: string;
  swap?: string;
  swapMaster?: string;
  lpToken?: string;
  poolID?: string;
  path?: string[];
  pathData?: {
    symbol: string[];
    sendAmount: string;
    receivedAmount: string;
    isReverseSwap: boolean;
  };
  from?: string;
  gas?: string | number;
  gasAmount?: string | number;
  borrowAmount?: string;
  amountTokenDesired?: string;
  amountETHDesired?: string;
  amountADesired?: string;
  amountBDesired?: string;
  deadline?: number;
  amountBMin?: string;
  amountAMin?: string;
  amountTokenMin?: string;
  amountETHMin?: string;
  pid?: number;
  amount?: string;
  token?: string;
  liquidity?: string;
  repayAmount?: string;
  vToken?: string;
  vTokens?: string[];
  mintAmount?: string;
  gasPrice?: number;
  gasUsed?: number;
  blockNumber?: number;
  multicall?: Array<Record<string, unknown>>;
}