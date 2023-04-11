import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { get, isArray } from 'lodash';
import { ERROR_CODES } from 'src/common/constants/error-codes';
import { LogicException } from 'src/common/logic.exception';
import { ContextService } from 'src/providers/context.service';
import { UtilsService } from 'src/providers/utils.service';
import { ConfigService } from 'src/shared/services/config.service';

import type { AccountEntity } from '../accounts/account.entity';
import { AccountsService } from '../accounts/accounts.service';
import { LoginPayloadDto } from './dto/LoginPayloadDto';
import { TokenPayloadDto } from './dto/TokenPayloadDto';

interface LoginUserInfoData {
  browser: string;
  browserVersion: string;
  os: string;
  ip: string;
}

interface AccountLoginData {
  email: string;
  password: string;
  code?: string;
}

@Injectable()
export class AuthService {
  private static authAccountKey = 'account_key';

  constructor(
    public readonly jwtService: JwtService,
    public readonly configService: ConfigService,
    public readonly accountsService: AccountsService,
  ) {}

  async createToken(account: { id: string }): Promise<TokenPayloadDto> {
    return new TokenPayloadDto({
      expiresIn: this.configService.jwt.expirationTime,
      accessToken: await this.jwtService.signAsync({
        id: account.id,
      }),
    });
  }

  async validateAccount(data: {
    email: string;
    password: string;
  }): Promise<AccountEntity> {
    const account = await this.accountsService.findOneAndCheckExist({
      email: data.email,
    });

    if (!account) {
      throw new LogicException(ERROR_CODES.NOT_FOUND_ACCOUNT);
    }

    const isPasswordValid = await UtilsService.validateHash(
      data.password,
      account && account.password,
    );

    if (!isPasswordValid) {
      // throw new LogicException(ERROR_CODES.INVALID_PASSWORD);
    }

    return account;
  }

  getLoginUserInfoData(req: Request): LoginUserInfoData {
    const browser = get(req, 'useragent.browser', '');
    const browserVersion = get(req, 'useragent.version');
    const os = get(req, 'useragent.os', '');

    let ipStr = get(req, 'headers.x-forwarded-for', null) || req.ip || req.ips;

    ipStr = !isArray(ipStr) ? ipStr.split(',') : ipStr;

    const ip = ipStr[0].replace('::ffff:', '');

    return {
      browser,
      browserVersion,
      os,
      ip,
    };
  }

  async createTokenAndReturnAcntInfo(data: {
    accountEntity: AccountEntity;
    browser;
    browserVersion;
    ip;
    os;
  }): Promise<LoginPayloadDto> {
    const { accountEntity } = data;

    try {
      const token = await this.createToken(accountEntity);

      return new LoginPayloadDto({ account: accountEntity.toDto(), token });
    } catch (error) {
      console.error(error);

      throw new LogicException(ERROR_CODES.AUTH);
    }
  }

  async login(
    accountLoginDto: AccountLoginData,
    req: Request,
  ): Promise<LoginPayloadDto> {
    const accountEntity = await this.validateAccount(accountLoginDto);

    const { browser, browserVersion, ip, os } = this.getLoginUserInfoData(req);

    return this.createTokenAndReturnAcntInfo({
      accountEntity,
      browserVersion,
      browser,
      os,
      ip,
    });
  }

  static setAuthAccount(account: AccountEntity): any {
    ContextService.set(AuthService.authAccountKey, account);
  }

  static getAuthAccount(): AccountEntity {
    return ContextService.get(AuthService.authAccountKey);
  }
}
