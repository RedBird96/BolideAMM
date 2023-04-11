import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ACCOUNT_ROLES } from 'src/common/constants/account-roles';
import { strToLowercase } from 'src/common/transform-fns/str-to-lowercase';

export class AuthAccountInfoDto {
  @ApiPropertyOptional()
  name: string;

  @ApiPropertyOptional()
  @Transform(strToLowercase)
  email: string;

  @ApiPropertyOptional({ enum: ACCOUNT_ROLES })
  role: ACCOUNT_ROLES;

  @ApiPropertyOptional()
  isActive: boolean;
}
