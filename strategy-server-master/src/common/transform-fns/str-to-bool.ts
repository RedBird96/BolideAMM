import type { TransformFnParams } from 'class-transformer';

export const strToBool = (params: TransformFnParams): boolean => {
  const { value } = params;

  switch (value) {
    case 'true':
      return true;
    case 'false':
      return false;
    default:
      return value;
  }
};
