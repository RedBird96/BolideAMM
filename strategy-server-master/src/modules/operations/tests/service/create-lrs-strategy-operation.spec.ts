import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ERROR_CODES } from 'src/common/constants/error-codes';
import { LogicException } from 'src/common/logic.exception';
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

const blockchainId = 1;
const strategyId = 1;

const operationMock = {
  meta: {},
  status: OPERATION_STATUS.IN_PROGRESS,
  type: OPERATION_TYPE.STRATEGY_RUN,
  runType: OPERATION_RUN_TYPE.JOB,
  blockchainId,
  strategyId,
};

describe('creatLbfStrategyOperation', () => {
  let app: TestingModule;
  let operationsRepository: OperationsRepository;
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

    operationsRepository = app.get<OperationsRepository>(OperationsRepository);
    operationsService = app.get<OperationsService>(OperationsService);
    connection = app.get<Connection>(Connection);
  });

  afterAll(async () => {
    await app.close();
    await connection.close();
  });

  describe('Проверяем, что будет ошибка из-за IN_PROGRESS операций', () => {
    let opt;

    beforeAll(async () => {
      opt = await operationsRepository.save({
        ...operationMock,
        status: OPERATION_STATUS.IN_PROGRESS,
      });
    });

    it('Вернется ошибка', async () => {
      try {
        await operationsService.createLbfStrategyOperation({
          runType: OPERATION_RUN_TYPE.API,
          type: OPERATION_TYPE.STRATEGY_RUN,
          status: OPERATION_STATUS.IN_PROGRESS,
          blockchainId,
          strategyId,
        });
      } catch (error) {
        expect(error?.response?.messages[0].code).toBe(
          ERROR_CODES.OPERATION_IN_PROGRESS_EXIST.code,
        );
      }
    });

    afterAll(async () => {
      await operationsRepository.delete({ id: opt.id });
    });
  });

  describe('Проверяем, что будет ошибка из-за PENDING операций', () => {
    let opt;

    beforeAll(async () => {
      opt = await operationsRepository.save({
        ...operationMock,
        status: OPERATION_STATUS.PENDING,
      });
    });

    it('Вернется ошибка', async () => {
      await expect(
        operationsService.createLbfStrategyOperation({
          runType: OPERATION_RUN_TYPE.API,
          type: OPERATION_TYPE.STRATEGY_RUN,
          blockchainId,
          strategyId,
        }),
      ).rejects.toThrow(
        new LogicException(ERROR_CODES.OPERATION_IN_PENDING_EXIST),
      );
    });

    afterAll(async () => {
      await operationsRepository.delete({ id: opt.id });
    });
  });

  describe('Проверяем, что создастся операция стратегии', () => {
    let opt;

    it('Вернется запись', async () => {
      opt = await operationsService.createLbfStrategyOperation({
        runType: OPERATION_RUN_TYPE.API,
        type: OPERATION_TYPE.STRATEGY_RUN,
        blockchainId,
        strategyId,
      });

      const expected = {
        status: 'PENDING',
        meta: {},
        runType: 'API',
        type: 'STRATEGY_RUN',
        bullJobId: null,
      };

      expect(opt).toMatchObject(expected);
    });

    afterAll(async () => {
      await operationsRepository.delete({ id: opt.id });
    });
  });
});
