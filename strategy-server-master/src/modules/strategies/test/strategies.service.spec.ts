import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PLATFORMS } from 'src/common/constants/platforms';
import { CONTRACT_TYPES } from 'src/modules/contracts/constants/contract-types';
import { ContractEntity } from 'src/modules/contracts/contract.entity';
import { ContractsService } from 'src/modules/contracts/contracts.service';
import { OperationsRepository } from 'src/modules/operations/operations.repository';
import { OperationsService } from 'src/modules/operations/operations.service';
import { BullMqService } from 'src/modules/queues/bullmq.service';
import { RuntimeKeyEntity } from 'src/modules/runtime-keys/runtime-key.entity';
import { RuntimeKeysService } from 'src/modules/runtime-keys/runtime-keys.service';
import { StrategiesService } from 'src/modules/strategies/strategies.service';
import { ConfigService } from 'src/shared/services/config.service';
import { SharedModule } from 'src/shared/shared.module';
import { Connection } from 'typeorm';
import {
  initializeTransactionalContext,
  patchTypeORMRepositoryWithBaseRepository,
} from 'typeorm-transactional-cls-hooked';
import { randomHex } from 'web3-utils';

import { StrategiesRepository } from '../strategies.repository';
import { StrategiesQueuesService } from '../strategies-queues.service';
import { StrategiesRunnerService } from '../strategies-runner.service';

const blockchainId = 1;
const strategyId = 1;

const bullMqServiceMock = {
  clearAndCloseQueue: jest.fn().mockResolvedValue(null),
  clearAndCloseQueueByName: jest.fn().mockResolvedValue(null),
  gracefulShutdownByName: jest.fn().mockResolvedValue(null),
  gracefulShutdown: jest.fn().mockResolvedValue(null),
  createQueue: jest.fn().mockResolvedValue(null),
  createWorker: jest.fn().mockResolvedValue(null),
  getQueue: jest.fn().mockResolvedValue(null),
  getWorker: jest.fn().mockResolvedValue(null),
  getAllQueues: jest.fn().mockResolvedValue(null),
};

describe('The StrategiesService', () => {
  let strategiesService: StrategiesService;
  let contractsService: ContractsService;
  let runtimeKeysService: RuntimeKeysService;
  let connection: Connection;

  initializeTransactionalContext();
  patchTypeORMRepositoryWithBaseRepository();

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRootAsync({
          imports: [SharedModule],
          useFactory: (configService: ConfigService) =>
            configService.typeOrmConfig,
          inject: [ConfigService],
        }),
        TypeOrmModule.forFeature([
          StrategiesRepository,
          ContractEntity,
          RuntimeKeyEntity,
          OperationsRepository,
        ]),
      ],
      providers: [
        StrategiesService,
        ContractsService,
        RuntimeKeysService,
        StrategiesRunnerService,
        StrategiesQueuesService,
        {
          provide: BullMqService,
          useValue: bullMqServiceMock,
        },
        OperationsService,
      ],
    })
      .useMocker(() => ({}))
      .compile();

    strategiesService = module.get<StrategiesService>(StrategiesService);
    contractsService = module.get<ContractsService>(ContractsService);
    runtimeKeysService = module.get<RuntimeKeysService>(RuntimeKeysService);

    connection = module.get<Connection>(Connection);
  });

  afterAll(async () => {
    await connection.close();
  });

  describe('updateStrategyById', () => {
    it('should update storage contract', async () => {
      const contract = await contractsService.createContract({
        blockchainId,
        address: randomHex(20),
        platform: PLATFORMS.BOLIDE,
        type: CONTRACT_TYPES.STR_STORAGE,
        name: 'Test Storage Contract',
        data: {
          approvedTokens: [randomHex(20), randomHex(20)],
        },
      });

      const strategy = await strategiesService.updateStrategyById(strategyId, {
        storageContractId: contract.id,
      });

      expect(strategy.storageContractId).toEqual(contract.id);
      expect(strategy.storageContract.id).toEqual(contract.id);
      expect(strategy.isActive).toBeFalsy();
    });
  });

  it('should update logic contract', async () => {
    const contract = await contractsService.createContract({
      blockchainId,
      address: randomHex(20),
      platform: PLATFORMS.BOLIDE,
      type: CONTRACT_TYPES.STR_LOGIC,
      name: 'Test Logic Contract',
    });

    const strategy = await strategiesService.updateStrategyById(strategyId, {
      logicContractId: contract.id,
    });

    expect(strategy.logicContractId).toEqual(contract.id);
    expect(strategy.logicContract.id).toEqual(contract.id);
    expect(strategy.isActive).toBeFalsy();
  });

  it('should update boostingPrivateKeyId', async () => {
    const key = await runtimeKeysService.create({
      name: 'Test Boosting PK',
      description: '',
    });

    const strategy = await strategiesService.updateStrategyById(strategyId, {
      boostingPrivateKeyId: key.id,
    });

    expect(strategy.boostingPrivateKeyId).toEqual(key.id);
    expect(strategy.isActive).toBeFalsy();
  });

  it('should update operationsPrivateKeyId', async () => {
    const key = await runtimeKeysService.create({
      name: 'Test Operations PK',
      description: '',
    });

    const strategy = await strategiesService.updateStrategyById(strategyId, {
      operationsPrivateKeyId: key.id,
    });

    expect(strategy.operationsPrivateKeyId).toEqual(key.id);
    expect(strategy.isActive).toBeFalsy();
  });
});
