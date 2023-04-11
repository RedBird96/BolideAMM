import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional } from 'class-validator';
import { ACCOUNT_ROLES } from 'src/common/constants/account-roles';
import { PageOptionsDto } from 'src/common/dto/PageOptionsDto';
import { strToAccountRole } from 'src/common/transform-fns/str-to-account-role';
import { strToLowercase } from 'src/common/transform-fns/str-to-lowercase';

export class AccountsPageOptionsDto extends PageOptionsDto {
  @ApiPropertyOptional({ isArray: true, type: [ACCOUNT_ROLES] })
  @IsOptional()
  @Transform(strToAccountRole)
  roles?: ACCOUNT_ROLES[];

  @ApiPropertyOptional()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @Transform(strToLowercase)
  email?: string;
}
