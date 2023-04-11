import type { NestExpressApplication } from '@nestjs/platform-express';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ACCOUNT_ROLES } from 'src/common/constants/account-roles';
import { admin } from 'src/migrations/data/seeds/admin';
import { ConfigService } from 'src/shared/services/config.service';
import { SharedModule } from 'src/shared/shared.module';
import request from 'supertest';
import { Connection } from 'typeorm';

import { AppModule } from './../src/app.module';
import { getAdminToken } from './helpers/get-tokens';
import { setupTestApp } from './helpers/setup-test-app';
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
require('events').EventEmitter.prototype._maxListeners = 100;

let app: NestExpressApplication;
let connection: Connection;
let moduleFixture: TestingModule;

describe('Старт приложения и хелперы (e2e)', () => {
  beforeAll(async () => {
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

  describe('админ был создан', () => {
    let accessToken;

    it('тестируем получение админского токена', async () => {
      const response = await getAdminToken(app);
      accessToken = response.body?.token?.accessToken;

      expect(response.status).toBe(200);
      expect(accessToken).toBeDefined();
      expect(response.body?.account?.email).toBe(admin.email);
      expect(response.body?.account?.role).toBe(ACCOUNT_ROLES.ADMIN);
    });

    it('accessToken рабочий в auth/me', async () => {
      expect(accessToken).toBeDefined();

      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBeDefined();
      expect(response.body.role).toBe(ACCOUNT_ROLES.ADMIN);
    });
  });

  afterAll(async () => {
    await Promise.all([moduleFixture.close(), app.close(), connection.close()]);
  });
});
