import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ORDER } from 'src/common/constants/order';
import { BlockchainsService } from 'src/modules/blockchains/blockchains.service';
import { BnbUtilsService } from 'src/modules/bnb/bnb-utils.service';
import { BnbWeb3Service } from 'src/modules/bnb/bnb-web3.service';
import { TransactionsRepository } from 'src/modules/bnb/transactions.repository';
import { TransactionsService } from 'src/modules/bnb/transactions.service';
import { UniswapEthService } from 'src/modules/bnb/uniswap/uniswap-eth.service';
import { ContractsService } from 'src/modules/contracts/contracts.service';
import { ConfigService } from 'src/shared/services/config.service';
import { SharedModule } from 'src/shared/shared.module';
import { Connection } from 'typeorm';

import { BigNumber } from '../../../../common/utils/BigNumber';
import {
  OPERATION_RUN_TYPE,
  OPERATION_STATUS,
  OPERATION_TYPE,
} from '../../operation.entity';
import { OperationsRepository } from '../../operations.repository';
import { OperationsService } from '../../operations.service';

jest.setTimeout(10_000);

const operationMock = {
  meta: {},
  status: OPERATION_STATUS.IN_PROGRESS,
  type: OPERATION_TYPE.STRATEGY_RUN,
  runType: OPERATION_RUN_TYPE.JOB,
  blockchainId: 1,
  strategyId: 1,
};

const blockchainsServiceMock = {
  getBnbBlockchainEntity: jest.fn().mockResolvedValue({}),
};

const BNB = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';

const contractsServiceMock = {
  getStorageTokenByName: jest.fn().mockReturnValue({ address: '' }),
  getTokenByAddress: jest.fn().mockReturnValue({ address: '' }),
  getContract: jest.fn().mockReturnValue({}),
  getLogicContractAddress: jest.fn().mockResolvedValue({}),
  getTokenByName: jest.fn().mockReturnValue(BNB),
  getInnerToken: jest.fn().mockReturnValue(BNB),
};

const bnbUtilsServiceMock = {
  getTokenAddressesByName: jest.fn().mockReturnValue(BNB),
  getGasPrice: jest.fn().mockReturnValue('0'),
  getDecimals: jest.fn().mockReturnValue(18),
};

const uniswapEthServiceMock = {
  getEtherPrice: jest.fn().mockReturnValue(new BigNumber(1)),
};

const transactionMock = {
  meta: { gasUsed: 21_000, gasPrice: 5_000_000_000 },
};

describe('failOperation', () => {
  let app: TestingModule;
  let transactionsRepository: TransactionsRepository;
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
      providers: [
        OperationsService,
        TransactionsService,
        BnbWeb3Service,
        {
          provide: BlockchainsService,
          useValue: blockchainsServiceMock,
        },
        {
          provide: ContractsService,
          useValue: contractsServiceMock,
        },
        {
          provide: BnbUtilsService,
          useValue: bnbUtilsServiceMock,
        },
        {
          provide: UniswapEthService,
          useValue: uniswapEthServiceMock,
        },
      ],
    })
      .useMocker(() => ({}))
      .compile();

    transactionsRepository = app.get<TransactionsRepository>(
      TransactionsRepository,
    );
    operationsRepository = app.get<OperationsRepository>(OperationsRepository);
    operationsService = app.get<OperationsService>(OperationsService);

    connection = app.get<Connection>(Connection);
  });

  afterAll(async () => {
    await app.close();
    await connection.close();
  });

  describe('Проверяем, что операции будут возвращены', () => {
    let opt1;
    let opt2;
    const uuid1 = '2cb4772b-41be-4ee5-b682-68e95cf1011b';
    const uuid2 = '0a3db0df-58b6-4883-b3ba-0a1685f5d9ed';

    beforeAll(async () => {
      const txList = ['hash1', 'hash2', 'hash3'];

      opt1 = await operationsRepository.save({ ...operationMock, id: uuid1 });
      opt2 = await operationsRepository.save({ ...operationMock, id: uuid2 });

      for (const el of txList) {
        await transactionsRepository.save({
          ...transactionMock,
          uid: opt1.id,
          hash: el,
        });
      }

      for (const el of txList) {
        await transactionsRepository.save({
          ...transactionMock,
          uid: opt2.id,
          hash: el,
        });
      }
    });

    it('Вернется 2 записи операций', async () => {
      const result = await operationsService.getOperations({
        page: 1,
        take: 10,
        order: ORDER.DESC,
        orderField: 'createdAt',
        type: OPERATION_TYPE.STRATEGY_RUN,
        runType: OPERATION_RUN_TYPE.JOB,
        status: OPERATION_STATUS.IN_PROGRESS,
        blockchainId: 1,
        strategyId: 1,
      });

      const expected = {
        items: [
          {
            id: uuid2,
            status: 'IN_PROGRESS',
            blockchainId: 1,
            strategyId: 1,
            type: 'STRATEGY_RUN',
            runType: 'JOB',
            meta: {},
            pid: null,
            bullJobId: null,
            transactionCount: 3,
          },
          {
            id: uuid1,
            status: 'IN_PROGRESS',
            blockchainId: 1,
            strategyId: 1,
            type: 'STRATEGY_RUN',
            runType: 'JOB',
            meta: {},
            pid: null,
            bullJobId: null,
            transactionCount: 3,
          },
        ],
        meta: {
          page: 1,
          take: 10,
          itemCount: 2,
          pageCount: 1,
        },
      };

      expect(result).toMatchObject(expected);
    });

    afterAll(async () => {
      await transactionsRepository.delete({ uid: opt1.id });
      await transactionsRepository.delete({ uid: opt2.id });

      await operationsRepository.delete({ id: opt1.id });
      await operationsRepository.delete({ id: opt2.id });
    });
  });
});
