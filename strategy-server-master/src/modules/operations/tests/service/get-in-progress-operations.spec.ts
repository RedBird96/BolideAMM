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

  describe('getInProgressLowRiskStrategyOperation tests', () => {
    it('Нет операций в статусе IN_PROGRESS', async () => {
      const result = await operationsService.getInProgressLbfOperation({
        strategyId: operationMock.strategyId,
      });

      expect(result).toBe(null);
    });
  });

  describe('Проверяем, что возвращаются операции в статусе', () => {
    let opt;

    beforeAll(async () => {
      opt = await operattionsRepository.save(operationMock);
    });

    it('Вернется 1 запись', async () => {
      const result = await operationsService.getInProgressLbfOperation({
        strategyId: operationMock.strategyId,
      });

      expect(result).toMatchObject(opt);
    });

    afterAll(async () => {
      await operattionsRepository.delete({ id: opt.id });
    });
  });

  describe('Проверяем, что возвращаются актуальная операция', () => {
    let opt1;
    let opt2;

    beforeAll(async () => {
      opt1 = await operattionsRepository.save(operationMock);
      opt2 = await operattionsRepository.save(operationMock);
    });

    it('Вернется 1 запись, которая создалась последней', async () => {
      const result = await operationsService.getInProgressLbfOperation({
        strategyId: operationMock.strategyId,
      });

      expect(result).toMatchObject(opt2);
    });

    afterAll(async () => {
      await operattionsRepository.delete({ id: opt1.id });
      await operattionsRepository.delete({ id: opt2.id });
    });
  });

  describe('Проверяем, что CLAIM_RUN не вернется', () => {
    let opt;

    beforeAll(async () => {
      opt = await operattionsRepository.save({
        ...operationMock,
        type: OPERATION_TYPE.CLAIM_RUN,
      });
    });

    it('Вернется так как не важно какой тип, важен процесс выполнения', async () => {
      const result = await operationsService.getInProgressLbfOperation({
        strategyId: operationMock.strategyId,
      });

      expect(result).not.toBe(null);
      expect(result.id).not.toBe(null);
    });

    afterAll(async () => {
      await operattionsRepository.delete({ id: opt.id });
    });
  });

  describe('Проверяем, что операция в другом статусе не вернтся', () => {
    let opt;

    beforeAll(async () => {
      opt = await operattionsRepository.save({
        ...operationMock,
        status: OPERATION_STATUS.PENDING,
      });
    });

    it('Ничего не вернется, так как статус не IN_PROGRESS', async () => {
      const result = await operationsService.getInProgressLbfOperation({
        strategyId: operationMock.strategyId,
      });

      expect(result).toBe(null);
    });

    afterAll(async () => {
      await operattionsRepository.delete({ id: opt.id });
    });
  });
});
