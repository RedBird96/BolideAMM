import type { TransformFnParams } from 'class-transformer';
import { ACCOUNT_ROLES } from 'src/common/constants/account-roles';

import { strToAccountRole } from '../str-to-account-role';

describe('тестируем strToAccountRole', () => {
  it('одно значение должно возвращать массив со значением', () => {
    const value = 'ADMIN';

    expect(strToAccountRole({ value } as TransformFnParams)).toEqual([
      ACCOUNT_ROLES.ADMIN,
    ]);
  });

  it(', должно возвращать null', () => {
    const value = ',';

    expect(strToAccountRole({ value } as TransformFnParams)).toEqual(null);
  });
});
