import { ACCOUNT_ROLES } from 'src/common/constants/account-roles';
import { ConfigService } from 'src/shared/services/config.service';

const config = new ConfigService();

export const admin = {
  role: ACCOUNT_ROLES.ADMIN,
  email: config.admin.email,
  password: config.admin.password,
  name: config.admin.name,
  isActive: true,
  isRegComplite: true,
};
