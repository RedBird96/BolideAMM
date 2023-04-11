import { AbstractUUIDEntity } from 'src/common/abstract-uuid.entity';
import { ACCOUNT_ROLES } from 'src/common/constants/account-roles';
import { Column, Entity } from 'typeorm';

import { AccountDto } from './dto/AccountDto';

export type AccountNegativeLimits = Record<string, string>;

@Entity({ name: 'accounts' })
export class AccountEntity extends AbstractUUIDEntity<AccountDto> {
  @Column({ nullable: true })
  name: string;

  @Column({ nullable: false, unique: true })
  email: string;

  @Column({ type: 'enum', enum: ACCOUNT_ROLES })
  role: ACCOUNT_ROLES;

  @Column({ nullable: true })
  password: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true, unique: true })
  telegramId: string;

  dtoClass = AccountDto;
}
