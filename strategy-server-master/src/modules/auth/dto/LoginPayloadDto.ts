import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

import { AccountDto } from '../../accounts/dto/AccountDto';
import { TokenPayloadDto } from './TokenPayloadDto';

export class LoginPayloadDto {
  @ApiPropertyOptional({ type: AccountDto })
  account?: AccountDto;

  @ApiPropertyOptional({ type: TokenPayloadDto })
  token?: TokenPayloadDto;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isAuthFromEmail?: boolean;

  constructor(data: {
    account?: AccountDto;
    token?: TokenPayloadDto;
    isAuthFromEmail?: boolean;
  }) {
    this.account = data.account;
    this.token = data.token;
    this.isAuthFromEmail = data.isAuthFromEmail;
  }
}
