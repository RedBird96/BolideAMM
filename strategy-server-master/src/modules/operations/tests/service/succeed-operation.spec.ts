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

const walletBalance = { bnbBalance: '2', blidBalance: '2' };

describe('succeedOperation', () => {
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

  describe('Проверяем, что меняется статус на SUCCESS для стратегии(без payload)', () => {
    let opt;

    beforeAll(async () => {
      opt = await operattionsRepository.save(operationMock);
    });

    it('Вернется 1 запись со статусом SUCCESS', async () => {
      await operationsService.succeedOperation({
        id: opt.id,
        metaToSave: {
          adminBalanceAfter: walletBalance,
          boostBalanceAfter: walletBalance,
        },
        meta: {
          adminBalanceBefore: walletBalance,
          boostBalanceBefore: walletBalance,
        },
      });
      const result = await operattionsRepository.findOne({ id: opt.id });

      expect(result.status).toBe(OPERATION_STATUS.SUCCESS);
      expect(opt.updatedAt.getTime()).toBeLessThan(result.updatedAt.getTime());
      expect(result.meta).toMatchObject({
        adminBalanceAfter: walletBalance,
        boostBalanceAfter: walletBalance,
        adminBalanceBefore: walletBalance,
        boostBalanceBefore: walletBalance,
      });
    });

    afterAll(async () => {
      await operattionsRepository.delete({ id: opt.id });
    });
  });

  describe('Проверяем, что меняется статус на SUCCESS для claim(c payload)', () => {
    let opt;

    beforeAll(async () => {
      opt = await operattionsRepository.save({
        ...operationMock,
        type: OPERATION_TYPE.CLAIM_RUN,
      });
    });

    it('Вернется 1 запись со статусом SUCCESS', async () => {
      const payload = {
        wallet: 'string',
        earnUsd: 'string',
        earnBlid: 'string',
        priceBlid: 'string',
        lastTxBlockNumber: 777,
      };

      await operationsService.succeedOperation({
        id: opt.id,
        metaToSave: {
          adminBalanceAfter: walletBalance,
          boostBalanceAfter: walletBalance,
          payload,
        },
        meta: {
          adminBalanceBefore: walletBalance,
          boostBalanceBefore: walletBalance,
        },
      });
      const result = await operattionsRepository.findOne({ id: opt.id });

      expect(result.status).toBe(OPERATION_STATUS.SUCCESS);
      expect(opt.updatedAt.getTime()).toBeLessThan(result.updatedAt.getTime());
      expect(result.meta).toMatchObject({
        adminBalanceAfter: walletBalance,
        boostBalanceAfter: walletBalance,
        adminBalanceBefore: walletBalance,
        boostBalanceBefore: walletBalance,
        payload,
      });
    });

    afterAll(async () => {
      await operattionsRepository.delete({ id: opt.id });
    });
  });
});
