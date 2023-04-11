import type { TransformFnParams } from 'class-transformer';

import { ACCOUNT_ROLES } from '../constants/account-roles';

export const strToAccountRole = (params: TransformFnParams): any => {
  const { value } = params;

  if (typeof value === 'string') {
    return ACCOUNT_ROLES[value] ? [ACCOUNT_ROLES[value]] : null;
  }

  return value;
};
