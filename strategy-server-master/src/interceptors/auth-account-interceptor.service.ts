import type {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
} from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { Observable } from 'rxjs';

import type { AccountEntity } from '../modules/accounts/account.entity';
import { AuthService } from '../modules/auth/auth.service';

@Injectable()
export class AuthAccountInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    const account = <AccountEntity>request.user;

    AuthService.setAuthAccount(account);

    return next.handle();
  }
}
