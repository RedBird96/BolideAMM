import Decimal from 'decimal.js';
import { ethers } from 'ethers';

import { safeBN } from './big-number-utils';
import type { BigNumber } from './BigNumber';

export const fromWeiToDecimal = (value: Decimal, decimals = 18): Decimal =>
  new Decimal(ethers.utils.formatUnits(value.toFixed(0), decimals).toString());

export const fromBnToDecimal = (value: BigNumber): Decimal =>
  new Decimal(safeBN(value));

export const fromBnWeiToDecimalNormal = (value: BigNumber): Decimal =>
  fromWeiToDecimal(fromBnToDecimal(value));
