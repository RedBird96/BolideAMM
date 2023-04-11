import type { CustomDecorator } from '@nestjs/common';
import { SetMetadata } from '@nestjs/common';

import type { ACCOUNT_ROLES } from '../common/constants/account-roles';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Roles = (...roles: ACCOUNT_ROLES[]): CustomDecorator<any> =>
  SetMetadata('roles', roles);
