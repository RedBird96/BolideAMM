import {
  BadRequestException,
  ClassSerializerInterceptor,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { WsAdapter } from '@nestjs/platform-ws';
import type { ValidationError } from 'class-validator/types/validation/ValidationError';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import RateLimit from 'express-rate-limit';
import useragent from 'express-useragent';
import { BadRequestExceptionFilter } from 'src/filters/bad-request-exception.filter';
import { ForbiddenExceptionFilter } from 'src/filters/forbidden-exception.filter';
import { QueryFailedExceptionFilter } from 'src/filters/query-failed-exception.filter';
import { UnauthorizedExceptionFilter } from 'src/filters/unauthorized-exception.filter';

export const setupTestApp = (app: NestExpressApplication): void => {
  app.use(cookieParser());
  app.useWebSocketAdapter(new WsAdapter(app));

  app.use(
    RateLimit({
      windowMs: 1 * 60 * 1000, // 1 minutes
      max: 10_000, // limit each IP to 10000 requests per windowMs
    }),
  );
  app.use(compression());

  app.use(useragent.express());

  const reflector = app.get(Reflector);

  app.useGlobalInterceptors(new ClassSerializerInterceptor(reflector));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: false,
      dismissDefaultMessages: false,
      validationError: {
        target: true,
        value: true,
      },
      exceptionFactory: (errors: ValidationError[]) =>
        new BadRequestException(errors),
    }),
  );

  app.useGlobalFilters(
    new ForbiddenExceptionFilter(),
    new UnauthorizedExceptionFilter(),
    new QueryFailedExceptionFilter(),
    new BadRequestExceptionFilter(),
  );
};
