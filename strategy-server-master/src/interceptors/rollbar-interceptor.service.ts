import type {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
} from '@nestjs/common';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { RollbarLogger } from 'nestjs-rollbar';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class RollbarInterceptor implements NestInterceptor {
  constructor(private readonly rollbarLogger: RollbarLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      tap(null, (exception) => {
        if (exception instanceof InternalServerErrorException) {
          this.rollbarLogger.error(exception);
        }
      }),
    );
  }
}
