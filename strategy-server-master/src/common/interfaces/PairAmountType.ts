import type { BigNumber } from '../utils/BigNumber';

export interface PairAmountType {
  token1Amount: BigNumber;
  token1BorrowAmount: BigNumber;
  token2Amount: BigNumber;
  token2BorrowAmount: BigNumber;
}
