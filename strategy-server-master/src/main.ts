import {
  BadRequestException,
  ClassSerializerInterceptor,
  ValidationPipe,
} from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ExpressAdapter } from '@nestjs/platform-express';
import { WsAdapter } from '@nestjs/platform-ws';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as bodyParser from 'body-parser';
import type { ValidationError } from 'class-validator/types/validation/ValidationError';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import RateLimit from 'express-rate-limit';
import useragent from 'express-useragent';
import morgan from 'morgan';
import { Logger } from 'nestjs-pino';
import {
  initializeTransactionalContext,
  patchTypeORMRepositoryWithBaseRepository,
} from 'typeorm-transactional-cls-hooked';

import { description, name, version } from './../package.json';
import { AppModule } from './app.module';
import { BadRequestExceptionFilter } from './filters/bad-request-exception.filter';
import { ForbiddenExceptionFilter } from './filters/forbidden-exception.filter';
import { QueryFailedExceptionFilter } from './filters/query-failed-exception.filter';
import { UnauthorizedExceptionFilter } from './filters/unauthorized-exception.filter';
import { ConfigService } from './shared/services/config.service';
import { SharedModule } from './shared/shared.module';
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
require('events').EventEmitter.prototype._maxListeners = 100;

export async function bootstrap(): Promise<void> {
  initializeTransactionalContext();
  patchTypeORMRepositoryWithBaseRepository();

  const isDev = process.env.NODE_ENV === 'development';

  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(),
    {
      cors: true,
    },
  );

  app.useLogger(app.get(Logger));

  app.use(cookieParser());

  app.use(bodyParser.json({ limit: '1mb' }));
  app.use(bodyParser.urlencoded({ limit: '1mb', extended: true }));

  // register WS adapter
  app.useWebSocketAdapter(new WsAdapter(app));

  const configService = app.select(SharedModule).get(ConfigService);

  app.use(
    RateLimit({
      windowMs: 1 * 60 * 1000, // 1 minutes
      max: 10_000, // limit each IP to 10000 requests per windowMs
    }),
  );
  app.use(compression());

  if (isDev) {
    app.use(morgan('combined'));
  }

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

  if (configService.isShowDocs) {
    const options = new DocumentBuilder()
      .setTitle(description)
      .setDescription(name)
      .setVersion(version)
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, options);

    SwaggerModule.setup('swagger', app, document);
  }

  await app.listen(configService.appPort);
}

void bootstrap();
