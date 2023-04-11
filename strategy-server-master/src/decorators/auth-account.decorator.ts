import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const AuthAccount = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();

    // в request по умолчанию хранит поле как user
    return request.user;
  },
);
