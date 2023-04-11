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

describe('createClaimOperation', () => {
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

  describe('Проверяем, что создается claim операция', () => {
    let opt;

    it('Вернется 1 запись', async () => {
      opt = await operationsService.createClaimOperation({
        runType: OPERATION_RUN_TYPE.API,
        type: OPERATION_TYPE.CLAIM_RUN,
        blockchainId: 1,
        strategyId: 1,
      });

      expect(opt.status).toBe(OPERATION_STATUS.IN_PROGRESS);
      expect(opt.blockchainId).toBe(1);
      expect(opt.strategyId).toBe(1);
      expect(opt.pid).toBe(process.pid);
      expect(opt.meta).toMatchObject({});
      expect(opt.runType).toBe(OPERATION_RUN_TYPE.API);
      expect(opt.type).toBe(OPERATION_TYPE.CLAIM_RUN);
    });

    afterAll(async () => {
      await operattionsRepository.delete({ id: opt.id });
    });
  });
});
