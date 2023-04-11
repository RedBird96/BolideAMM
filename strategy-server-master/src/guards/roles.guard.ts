import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { AccountEntity } from '../modules/accounts/account.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  constructor(private readonly _reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this._reflector.get<string[]>('roles', context.getHandler());

    if (!roles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const account = <AccountEntity>request.user;

    return roles.includes(account.role);
  }
}
