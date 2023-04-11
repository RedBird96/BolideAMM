import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import Cookies from 'cookies';
import type { Request } from 'express';
import type { JwtFromRequestFunction } from 'passport-jwt';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from 'src/shared/services/config.service';

import { AccountsService } from '../accounts/accounts.service';

const configService = new ConfigService();

const cookiesTokenExtractor: JwtFromRequestFunction = function (req: Request) {
  const cookies = Cookies(req, null as any);

  const accessTokenFromCookies = cookies.get(
    configService.accessTokenCookieName,
  );

  if (accessTokenFromCookies) {
    return accessTokenFromCookies;
  }

  return null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(public readonly accountsService: AccountsService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        cookiesTokenExtractor,
      ]),
      secretOrKey: configService.jwt.secretKey,
    });
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  async validate({ iat, exp, id: accountId }: any): Promise<any> {
    const timeDiff = exp - iat;

    if (timeDiff <= 0) {
      throw new UnauthorizedException();
    }

    if (typeof accountId !== 'string') {
      throw new UnauthorizedException();
    }

    const account = await this.accountsService.findOneAndCheckExist({
      id: accountId,
    });

    if (!account) {
      throw new UnauthorizedException();
    }

    return account;
  }
}
