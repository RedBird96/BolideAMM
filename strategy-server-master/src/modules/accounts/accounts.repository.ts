import { ACCOUNT_ROLES } from 'src/common/constants/account-roles';
import { ERROR_CODES } from 'src/common/constants/error-codes';
import { LogicException } from 'src/common/logic.exception';
import { ConfigService } from 'src/shared/services/config.service';
import { Repository } from 'typeorm';
import { EntityRepository } from 'typeorm/decorator/EntityRepository';

import { AccountEntity } from './account.entity';

@EntityRepository(AccountEntity)
export class AccountsRepository extends Repository<AccountEntity> {
  constructor(public readonly configService: ConfigService) {
    super();
  }

  async findOneByEmail(email: string): Promise<AccountEntity | undefined> {
    return this.findOne({
      email: email.toLowerCase(),
    });
  }

  async getAdminAccount(): Promise<AccountEntity> {
    const account = await this.findOne({
      role: ACCOUNT_ROLES.ADMIN,
    });

    if (!account) {
      throw new LogicException(ERROR_CODES.NOT_FOUND_ACCOUNT);
    }

    return account;
  }
}
