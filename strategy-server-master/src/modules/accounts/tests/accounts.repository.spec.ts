import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from 'src/shared/services/config.service';
import { SharedModule } from 'src/shared/shared.module';
import { Connection } from 'typeorm';

import { AccountsRepository } from '../accounts.repository';

describe('AccountsRepository', () => {
  let app: TestingModule;
  let connection: Connection;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRootAsync({
          imports: [SharedModule],
          useFactory: (configService: ConfigService) =>
            configService.typeOrmConfig,
          inject: [ConfigService],
        }),
        TypeOrmModule.forFeature([AccountsRepository]),
      ],
      controllers: [],
      providers: [],
    })
      .useMocker(() => ({}))
      .compile();

    connection = app.get<Connection>(Connection);
  });

  afterAll(async () => {
    await app.close();
    await connection.close();
  });

  describe('конфиг базы данных должен быть тестовый', () => {
    let configService: ConfigService;

    beforeAll(() => {
      configService = new ConfigService();
    });

    it('NODE_ENV === test', () => {
      expect(configService.nodeEnv).toBe('test');
    });

    it('база должна быть strategy_server_local_test', () => {
      expect(configService.typeOrmConfig.database).toBe(
        'strategy_server_local_test',
      );
    });
  });
});
