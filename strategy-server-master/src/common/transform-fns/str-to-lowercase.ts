import type { TransformFnParams } from 'class-transformer';

export const strToLowercase = (params: TransformFnParams): boolean => {
  const { value } = params;

  if (value) {
    return value.toLowerCase();
  }

  return value;
};
