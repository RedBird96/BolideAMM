import type { NestExpressApplication } from '@nestjs/platform-express';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from 'src/shared/services/config.service';
import { SharedModule } from 'src/shared/shared.module';
import request from 'supertest';
import { clearDB } from 'test/helpers/clear-db';
import { getReq } from 'test/helpers/requests';
import { Connection } from 'typeorm';
import { initializeTransactionalContext } from 'typeorm-transactional-cls-hooked';

import { AppModule } from './../../../src/app.module';
import { getClientToken } from './../../helpers/get-tokens';
import { setupTestApp } from './../../helpers/setup-test-app';

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
require('events').EventEmitter.prototype._maxListeners = 100;

let app: NestExpressApplication;
let connection: Connection;
let moduleFixture: TestingModule;

describe('Выход из системы (e2e)', () => {
  beforeAll(async () => {
    await initializeTransactionalContext();

    moduleFixture = await Test.createTestingModule({
      imports: [
        AppModule,
        TypeOrmModule.forRootAsync({
          imports: [SharedModule],
          useFactory: (configService: ConfigService) =>
            configService.typeOrmConfig,
          inject: [ConfigService],
        }),
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    setupTestApp(app);

    await app.init();

    connection = app.get<Connection>(Connection);
  });

  it('/health (GET)', async () =>
    request(app.getHttpServer()).get('/health').expect(200).expect({
      msg: true,
    }));

  describe('регистрация пользователя', () => {
    let accessToken;

    it('получаем токен клиента', async () => {
      const response = await getClientToken(app);
      accessToken = response.body?.token?.accessToken;

      expect(response.status).toBe(200);
      expect(accessToken).toBeDefined();
    });

    it('выходим из системы', async () => {
      const response = await getReq({
        url: '/auth/logout',
        accessToken,
        app,
      });

      const setCookieHeader = response.header['set-cookie'][0];

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        msg: 'ok',
      });
      expect(setCookieHeader.includes('accessToken=;')).toBe(true);
      expect(setCookieHeader.includes('httponly')).toBe(true);
      expect(setCookieHeader.includes('path=/;')).toBe(true);
    });

    afterAll(() => {
      jest.clearAllMocks();
    });
  });

  afterAll(async () => {
    await clearDB(connection);
    await Promise.all([moduleFixture.close(), app.close(), connection.close()]);
  });
});
