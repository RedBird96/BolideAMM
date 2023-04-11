import type { TransformFnParams } from 'class-transformer';
import { DateTime } from 'luxon';

export const strToPgIsoDate = (params: TransformFnParams): any => {
  const { value } = params;

  if (value && value.length > 0) {
    return `${DateTime.fromISO(value).toISO({
      includeOffset: false,
    })}Z`;
  }

  return value;
};
