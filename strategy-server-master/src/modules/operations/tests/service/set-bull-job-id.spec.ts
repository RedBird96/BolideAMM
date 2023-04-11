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
  status: OPERATION_STATUS.PENDING,
  type: OPERATION_TYPE.STRATEGY_RUN,
  runType: OPERATION_RUN_TYPE.JOB,
  bullJobId: 'bull-job-id-1',
  blockchainId: 1,
  strategyId: 1,
};

describe('SetBullJobId', () => {
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

  describe('Проверяем, что меняется bullJobId в операции', () => {
    let opt;

    beforeAll(async () => {
      opt = await operattionsRepository.save(operationMock);
    });

    it('Успешно поменяется bullJobId', async () => {
      expect(opt.bullJobId).toBe('bull-job-id-1');
      await operationsService.setBullJobId(opt.id, 'bull-job-id-2');
      const result = await operattionsRepository.findOne({ id: opt.id });
      expect(result.bullJobId).toBe('bull-job-id-2');
    });

    afterAll(async () => {
      await operattionsRepository.delete({ id: opt.id });
    });
  });
});
