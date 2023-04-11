import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ACCOUNT_ROLES } from 'src/common/constants/account-roles';
import { AbstractUUIDDto } from 'src/common/dto/AbstractUuidDto';
import { strToLowercase } from 'src/common/transform-fns/str-to-lowercase';

import type { AccountEntity } from '../account.entity';

export class AccountDto extends AbstractUUIDDto {
  @ApiPropertyOptional()
  name: string;

  @ApiPropertyOptional()
  @Transform(strToLowercase)
  email: string;

  @ApiPropertyOptional({ enum: ACCOUNT_ROLES })
  role: ACCOUNT_ROLES;

  @ApiPropertyOptional()
  isActive: boolean;

  constructor(account: AccountEntity) {
    super(account);

    this.name = account.name;
    this.email = account.email;
    this.role = account.role;
    this.isActive = account.isActive;
  }
}
