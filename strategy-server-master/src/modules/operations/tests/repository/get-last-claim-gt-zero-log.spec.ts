import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from 'src/shared/services/config.service';
import { SharedModule } from 'src/shared/shared.module';
import { Connection } from 'typeorm';

import type { OperationEntity } from '../../operation.entity';
import {
  OPERATION_RUN_TYPE,
  OPERATION_STATUS,
  OPERATION_TYPE,
} from '../../operation.entity';
import { OperationsRepository } from '../../operations.repository';

const strategyId = 1;

const logFixture = {
  meta: {
    payload: {
      earnBlid: Number('0').toString(),
      priceBlid: Number('1').toString(),
      earnUsd: Number('2').toString(),
      wallet: Number('3').toString(),
      lastTxBlockNumber: 1234,
    },
  },
  status: OPERATION_STATUS.SUCCESS,
  type: OPERATION_TYPE.CLAIM_RUN,
  runType: OPERATION_RUN_TYPE.JOB,
  blockchainId: 1,
  strategyId,
};

describe('OperattionsRepository => getLastClaimGtZeroLog', () => {
  let app: TestingModule;
  let operattionsRepository: OperationsRepository;
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
        TypeOrmModule.forFeature([OperationsRepository]),
      ],
      controllers: [],
      providers: [],
    })
      .useMocker(() => ({}))
      .compile();

    operattionsRepository = app.get<OperationsRepository>(OperationsRepository);
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

  describe('проверяем что save обвновляет данные', () => {
    let log: OperationEntity;

    beforeAll(async () => {
      log = await operattionsRepository.saveOperation(logFixture);
    });

    it('лог был создан успешно', () => {
      expect(log.id).toBeDefined();
      expect(log.meta.payload.earnBlid).toBe('0');
      expect(log.meta.payload.priceBlid).toBe('1');
      expect(log.meta.payload.earnUsd).toBe('2');
      expect(log.meta.payload.wallet).toBe('3');
      expect(log.createdAt).toBeDefined();
      expect(log.updatedAt).toBeDefined();
    });

    afterAll(async () => {
      await operattionsRepository.delete({ id: log.id });
    });
  });

  describe('поиск последней записи ничего не вернет, если earnUsd null', () => {
    let log: OperationEntity;

    beforeAll(async () => {
      const obj = { ...logFixture };
      obj.meta.payload.earnUsd = null;
      log = await operattionsRepository.saveOperation(obj);
    });

    it('вернется undefined', async () => {
      const result = await operattionsRepository.getLastClaimGtZeroLog({
        strategyId,
      });

      expect(result).toBeUndefined();
    });

    afterAll(async () => {
      await operattionsRepository.delete({ id: log.id });
    });
  });

  describe("поиск последней записи ничего не вернет, если earnUsd '0'", () => {
    let log: OperationEntity;

    beforeAll(async () => {
      const obj = { ...logFixture };
      obj.meta.payload.earnUsd = '0';
      log = await operattionsRepository.saveOperation(obj);
    });

    it('вернется undefined', async () => {
      const result = await operattionsRepository.getLastClaimGtZeroLog({
        strategyId,
      });

      expect(result).toBeUndefined();
    });

    afterAll(async () => {
      await operattionsRepository.delete({ id: log.id });
    });
  });

  describe('поиск последней записи вернет запись если больше 0', () => {
    let log: OperationEntity;

    beforeAll(async () => {
      const obj = { ...logFixture };
      obj.meta.payload.earnUsd = '1';
      log = await operattionsRepository.saveOperation(obj);
    });

    it('вернется запись лога', async () => {
      const result = await operattionsRepository.getLastClaimGtZeroLog({
        strategyId,
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });

    afterAll(async () => {
      await operattionsRepository.delete({ id: log.id });
    });
  });

  describe('вернет последнюю запись лога по дате', () => {
    let log1: any;
    let log2: any;

    beforeAll(async () => {
      const obj = { ...logFixture };
      obj.meta.payload.earnUsd = '2';
      log1 = await operattionsRepository.saveOperation(obj);

      const obj2 = { ...logFixture };
      obj2.meta.payload.earnUsd = '2';
      log2 = await operattionsRepository.saveOperation(obj2);
    });

    it('вернется запись лога', async () => {
      const result = await operattionsRepository.getLastClaimGtZeroLog({
        strategyId,
      });

      expect(result).toBeDefined();
      expect(result.id).toBe(log2.id);
    });

    afterAll(async () => {
      await operattionsRepository.delete({ id: log1.id });
      await operattionsRepository.delete({ id: log2.id });
    });
  });
});
