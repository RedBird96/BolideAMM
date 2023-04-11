import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ORDER } from 'src/common/constants/order';
import { ConfigService } from 'src/shared/services/config.service';
import { SharedModule } from 'src/shared/shared.module';
import { Connection } from 'typeorm';

import type { OperationsListDto } from '../../dto/OperationsListDto';
import {
  OPERATION_RUN_TYPE,
  OPERATION_STATUS,
  OPERATION_TYPE,
} from '../../operation.entity';
import { OperationsRepository } from '../../operations.repository';

const meta = {
  payload: {
    earnBlid: '0',
    priceBlid: '1',
    earnUsd: '2',
    wallet: '3',
    lastTxBlockNumber: 1234,
  },
  adminBalanceAfter: {
    bnbBalance: '10',
    blidBalance: '10',
  },
  boostBalanceAfter: {
    bnbBalance: '10',
    blidBalance: '10',
  },
  adminBalanceBefore: {
    bnbBalance: '100',
    blidBalance: '100',
  },
  boostBalanceBefore: {
    bnbBalance: '100',
    blidBalance: '100',
  },
};

const logFixture = {
  meta,
  status: OPERATION_STATUS.SUCCESS,
  type: OPERATION_TYPE.CLAIM_RUN,
  runType: OPERATION_RUN_TYPE.JOB,
  blockchainId: 1,
  strategyId: 1,
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

  describe('Проверяем, что корректно приходит список если нет операций', () => {
    let optList: OperationsListDto;

    it('Вернется 0 записей', async () => {
      optList = await operattionsRepository.getItems({
        order: ORDER.DESC,
        orderField: 'createdAt',
        status: logFixture.status,
        type: logFixture.type,
        runType: logFixture.runType,
        blockchainId: 1,
        strategyId: 1,
        page: 1,
        take: 10,
      });

      expect(optList.items.length).toBe(0);

      expect(optList.meta).toMatchObject({
        page: 1,
        take: 10,
        itemCount: 0,
        pageCount: 0,
      });
    });
  });

  describe('Проверяем, что возвращаются операции', () => {
    let optList: OperationsListDto;
    const operationListId = [1, 2, 3, 4, 5];

    beforeAll(async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for (const optId of operationListId) {
        await operattionsRepository.saveOperation({
          ...logFixture,
        });
      }
    });

    it('Вернется 5 записей в правильном порядке', async () => {
      optList = await operattionsRepository.getItems({
        order: ORDER.DESC,
        orderField: 'createdAt',
        status: logFixture.status,
        type: logFixture.type,
        runType: logFixture.runType,
        blockchainId: 1,
        strategyId: 1,
        page: 1,
        take: 10,
      });

      expect(optList.items.length).toBe(operationListId.length);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const reversedOptList = [...operationListId].reverse();

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for (const [index, opt] of optList.items.entries()) {
        expect(opt.meta).toStrictEqual(meta);
        expect(opt.status).toBe(logFixture.status);
        expect(opt.type).toBe(logFixture.type);
        expect(opt.runType).toBe(logFixture.runType);
      }

      expect(optList.meta).toMatchObject({
        page: 1,
        take: 10,
        itemCount: operationListId.length,
        pageCount: 1,
      });
    });

    afterAll(async () => {
      for (const opt of optList.items) {
        await operattionsRepository.delete({ id: opt.id });
      }
    });
  });
});
