import type { Percent, Trade } from '@bolide/swap-sdk';
import { currencyEquals } from '@bolide/swap-sdk';
import { ERROR_CODES } from 'src/common/constants/error-codes';
import { LogicException } from 'src/common/logic.exception';

import { ONE_HUNDRED_PERCENT, ZERO_PERCENT } from './utils';

// returns whether tradeB is better than tradeA by at least a threshold percentage amount
export function isTradeBetter(
  tradeA: Trade | undefined | null,
  tradeB: Trade | undefined | null,
  minimumDelta: Percent = ZERO_PERCENT,
): boolean {
  if (tradeA && !tradeB) {
    return false;
  }

  if (tradeB && !tradeA) {
    return true;
  }

  if (!tradeA || !tradeB) {
    throw new LogicException(ERROR_CODES.DEX_AGGREGATOR.TRADES_NOT_DEFINED);
  }

  if (
    tradeA.tradeType !== tradeB.tradeType ||
    !currencyEquals(tradeA.inputAmount.currency, tradeB.inputAmount.currency) ||
    !currencyEquals(tradeA.outputAmount.currency, tradeB.outputAmount.currency)
  ) {
    throw new LogicException(ERROR_CODES.DEX_AGGREGATOR.TRADES_NOT_COMPARABLE);
  }

  if (minimumDelta.equalTo(ZERO_PERCENT)) {
    return tradeA.executionPrice.lessThan(tradeB.executionPrice);
  }

  return tradeA.executionPrice.raw
    .multiply(minimumDelta.add(ONE_HUNDRED_PERCENT))
    .lessThan(tradeB.executionPrice);
}
