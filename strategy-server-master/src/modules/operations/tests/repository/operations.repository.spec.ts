import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionsRepository } from 'src/modules/bnb/transactions.repository';
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
  status: OPERATION_STATUS.PENDING,
  type: OPERATION_TYPE.CLAIM_RUN,
  runType: OPERATION_RUN_TYPE.JOB,
  blockchainId: 1,
  strategyId: 1,
};

describe('OperattionsRepository tests', () => {
  let app: TestingModule;
  let operationsRepository: OperationsRepository;
  let transactionsRepository: TransactionsRepository;
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
        TypeOrmModule.forFeature([
          OperationsRepository,
          TransactionsRepository,
        ]),
      ],
      controllers: [],
      providers: [],
    })
      .useMocker(() => ({}))
      .compile();

    operationsRepository = app.get<OperationsRepository>(OperationsRepository);
    transactionsRepository = app.get<TransactionsRepository>(
      TransactionsRepository,
    );
    connection = app.get<Connection>(Connection);
  });

  afterAll(async () => {
    await app.close();
    await connection.close();
  });

  describe('проверяем что save обвновляет данные', () => {
    let operation: any;

    beforeAll(async () => {
      operation = await operationsRepository.saveOperation(logFixture);
    });

    it('лог был создан успешно', () => {
      expect(operation.id).toBeDefined();
      expect(operation.meta.payload.earnBlid).toBe('0');
      expect(operation.meta.payload.priceBlid).toBe('1');
      expect(operation.meta.payload.earnUsd).toBe('2');
      expect(operation.meta.payload.wallet).toBe('3');
      expect(operation.createdAt).toBeDefined();
      expect(operation.updatedAt).toBeDefined();
    });

    afterAll(async () => {
      await operationsRepository.delete({ id: operation.id });
    });
  });

  describe('проверяем что update обвновляет данные', () => {
    let operation: any;

    beforeAll(async () => {
      operation = await operationsRepository.saveOperation(logFixture);
    });

    it('лог был создан успешно', () => {
      expect(operation.id).toBeDefined();
    });

    it('обновляем статус операции', async () => {
      await operationsRepository.update(
        {
          id: operation.id,
        },
        {
          status: OPERATION_STATUS.FAILED,
          updatedAt: new Date(),
        },
      );

      const updated = await operationsRepository.findOne({ id: operation.id });

      expect(updated.status).toEqual(OPERATION_STATUS.FAILED);
    });

    afterAll(async () => {
      await operationsRepository.delete({ id: operation.id });
    });
  });

  describe('проверяем очистку операции clearOrphanedOperations', () => {
    let operation: OperationEntity;

    beforeEach(async () => {
      operation = await operationsRepository.saveOperation(logFixture);
    });

    it('что удаляюстя операции без транзакций', async () => {
      await operationsRepository.clearOrphanedOperations(new Date());

      const operations = await operationsRepository.find();
      expect(operations.length).toEqual(0);
    });

    it('что операции с транзакциями не удаляются', async () => {
      await transactionsRepository.saveTransaction({
        uid: operation.id,
        meta: null,
        method: '',
        func: '',
        hash: '',
        transactionRaw: null,
      });

      await operationsRepository.clearOrphanedOperations(new Date());

      const operations = await operationsRepository.find();
      expect(operations.length).toEqual(1);
      expect(operations[0].id).toEqual(operation.id);
    });

    afterEach(async () => {
      await transactionsRepository.delete({});
      await operationsRepository.delete({});
    });
  });
});
