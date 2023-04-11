import { JSBI, Percent } from '@bolide/swap-sdk';

export const BSC_CHAIN_ID = 56;

export enum ChainId {
  MAINNET = BSC_CHAIN_ID,
}

export const MAX_HOPS = 3;
export const MAX_NUM_RESULTS = 40;

export const ZERO_PERCENT = new Percent('0');
export const ONE_HUNDRED_PERCENT = new Percent('1');
export const BETTER_TRADE_LESS_HOPS_THRESHOLD = new Percent(
  JSBI.BigInt(50),
  JSBI.BigInt(10_000),
);

export const BASE_FEE = new Percent(JSBI.BigInt(25), JSBI.BigInt(10_000));
export const INPUT_FRACTION_AFTER_FEE = ONE_HUNDRED_PERCENT.subtract(BASE_FEE);
// one basis point
export const ONE_BIPS = new Percent(JSBI.BigInt(1), JSBI.BigInt(10_000));

export interface Call {
  address: string;
  callData: string;
}
