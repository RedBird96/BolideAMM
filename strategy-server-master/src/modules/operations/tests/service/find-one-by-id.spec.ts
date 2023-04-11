import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionsRepository } from 'src/modules/bnb/transactions.repository';
import { ConfigService } from 'src/shared/services/config.service';
import { SharedModule } from 'src/shared/shared.module';
import { Connection } from 'typeorm';

import {
  OPERATION_RUN_TYPE,
  OPERATION_STATUS,
  OPERATION_TYPE,
} from '../../operation.entity';
import { OperationsRepository } from '../../operations.repository';
import { OperationsService } from '../../operations.service';

const operationMock = {
  meta: {},
  status: OPERATION_STATUS.IN_PROGRESS,
  type: OPERATION_TYPE.STRATEGY_RUN,
  runType: OPERATION_RUN_TYPE.JOB,
  blockchainId: 1,
  strategyId: 1,
};

describe('getInProgressOperations', () => {
  let app: TestingModule;
  let operattionsRepository: OperationsRepository;
  let operationsService: OperationsService;
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
          TransactionsRepository,
          OperationsRepository,
        ]),
      ],
      controllers: [],
      providers: [OperationsService],
    })
      .useMocker(() => ({}))
      .compile();

    operattionsRepository = app.get<OperationsRepository>(OperationsRepository);
    operationsService = app.get<OperationsService>(OperationsService);
    connection = app.get<Connection>(Connection);
  });

  afterAll(async () => {
    await app.close();
    await connection.close();
  });

  describe('Проверяем, что возвращаются операции по id', () => {
    let opt;

    beforeAll(async () => {
      opt = await operattionsRepository.save(operationMock);
    });

    it('Вернется 1 запись', async () => {
      const result = await operationsService.findOneById(opt.id);

      expect(result).toMatchObject(opt);
    });

    afterAll(async () => {
      await operattionsRepository.delete({ id: opt.id });
    });
  });

  describe('Проверяем, что возвращаются актуальная операция', () => {
    let opt;

    beforeAll(async () => {
      opt = await operattionsRepository.save(operationMock);
    });

    it('Нет записей по этому id', async () => {
      const result = await operationsService.findOneById(
        '2cb4772b-41be-4ee5-b682-68e95cf1011b',
      );

      expect(result).toBe(null);
    });

    afterAll(async () => {
      await operattionsRepository.delete({ id: opt.id });
    });
  });
});
