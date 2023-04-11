import type { TransformFnParams } from 'class-transformer';
import Decimal from 'decimal.js';

export const strToWholeDecimal = (params: TransformFnParams): string => {
  const { value } = params;

  return new Decimal(value).toFixed(0, Decimal.ROUND_DOWN);
};
