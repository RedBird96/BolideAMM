import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ORDER } from 'src/common/constants/order';
import { PLATFORMS } from 'src/common/constants/platforms';
import { ApeSwapEthService } from 'src/modules/bnb/apeswap/apeswap-eth.serivce';
import type { Farm } from 'src/modules/bnb/interfaces/farm.interface';
import { CONTRACT_TYPES } from 'src/modules/contracts/constants/contract-types';
import { ContractEntity } from 'src/modules/contracts/contract.entity';
import { ContractsService } from 'src/modules/contracts/contracts.service';
import { StrategiesService } from 'src/modules/strategies/strategies.service';
import { ConfigService } from 'src/shared/services/config.service';
import { SharedModule } from 'src/shared/shared.module';
import { Connection } from 'typeorm';
import {
  initializeTransactionalContext,
  patchTypeORMRepositoryWithBaseRepository,
} from 'typeorm-transactional-cls-hooked';

import type { CreatePairOptionsDto } from '../dto/CreatePairOptionsDto';
import type { PairDto } from '../dto/PairDto';
import type { PairListOptionsDto } from '../dto/PairListOptionsDto';
import { PairsService } from '../pairs.service';

const blockchainId = 1;

const getPairsFilter: PairListOptionsDto = {
  page: 1,
  take: 100,
  order: ORDER.ASC,
  orderField: 'created_at',
};

jest.setTimeout(20_000);

const expectPairData = (pair: PairDto, data: CreatePairOptionsDto) => {
  expect(data.blockchainId).toEqual(pair.blockchainId);
  expect(data.platform).toEqual(pair.platform);
  expect(data.address).toEqual(pair.address);
  expect(data.fromTokenName).toEqual(pair.farm.token1);
  expect(data.toTokenName).toEqual(pair.farm.token2);
  expect(data.pid).toEqual(pair.farm.pid);
};

describe('The PairsService', () => {
  let pairsService: PairsService;
  let contractsService: ContractsService;
  let strategiesService: StrategiesService;
  let apeSwapEthService: ApeSwapEthService;
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
        TypeOrmModule.forFeature([ContractEntity]),
      ],
      providers: [
        PairsService,
        ContractsService,
        StrategiesService,
        ApeSwapEthService,
      ],
    })
      .useMocker(() => ({}))
      .compile();

    pairsService = module.get<PairsService>(PairsService);
    contractsService = module.get<ContractsService>(ContractsService);
    strategiesService = module.get<StrategiesService>(StrategiesService);
    apeSwapEthService = module.get<ApeSwapEthService>(ApeSwapEthService);

    connection = module.get<Connection>(Connection);
  });

  afterAll(async () => {
    await connection.close();
  });

  describe('getPairs', () => {
    it('should return only LP contracts', async () => {
      const contracts = await pairsService.getPairs(getPairsFilter);

      expect(
        contracts.items.every(
          (contract) => contract.type === CONTRACT_TYPES.LP_TOKEN,
        ),
      ).toBeTruthy();
    });

    it('should apply blockchainId filter', async () => {
      const contracts = await pairsService.getPairs({
        ...getPairsFilter,
        blockchainId,
      });

      expect(
        contracts.items.every(
          (contract) => contract.blockchainId === blockchainId,
        ),
      ).toBeTruthy();
    });

    it('should apply platform filter', async () => {
      const platform = PLATFORMS.APESWAP;
      const contracts = await pairsService.getPairs({
        ...getPairsFilter,
        platform,
      });

      expect(
        contracts.items.every((contract) => contract.platform === platform),
      ).toBeTruthy();
    });
  });

  describe('getUniquePairs', () => {
    it('all pairs shoud be unique by fromToken-toToken', async () => {
      const pairs = await pairsService.getUniquePairs();

      const set = new Set<string>();

      for (const pair of pairs) {
        set.add(pair.farm.pair);
      }

      expect(set.size).toEqual(pairs.length);
    });
  });

  describe('saveOrUpdatePair', () => {
    let pairId;

    const data: CreatePairOptionsDto = {
      blockchainId,
      fromTokenName: 'USDT',
      toTokenName: 'LINK',
      platform: PLATFORMS.PANCAKESWAP,
      address: '0x0',
      pid: 1,
    };

    it('should create a new pair', async () => {
      const pair = await pairsService.saveOrUpdatePair(data);
      pairId = pair.id;

      expectPairData(pair, data);
    });

    it('should update an existing pair', async () => {
      const newData = { ...data, address: '0x1', pid: 2 };

      const pair = await pairsService.saveOrUpdatePair(newData);

      expect(pair.id).toEqual(pairId);
      expectPairData(pair, newData);
    });

    afterAll(async () => {
      await contractsService.deleteContract(pairId);
    });
  });

  describe('removeAllByPlatform', () => {
    it('should delete pair from strategy and from contracts', async () => {
      const platform = PLATFORMS.APESWAP;
      const pairs = await pairsService.getPairs({
        ...getPairsFilter,
        platform,
      });
      const count = pairs.items.length;

      const spyDeleteStrategyPair = jest
        .spyOn(strategiesService, 'softDeletePair')
        .mockResolvedValue(null);
      const spyDeleteContract = jest
        .spyOn(contractsService, 'deleteContract')
        .mockResolvedValue(null);

      await pairsService.removeAllByPlatform(platform);

      expect(spyDeleteStrategyPair).toBeCalledTimes(count);
      expect(spyDeleteContract).toBeCalledTimes(count);
    });
  });

  describe('reloadPairs', () => {
    it('should execute `saveOrUpdatePair` for every loaded pair', async () => {
      const platform = PLATFORMS.APESWAP;
      const farmsCount = 10;

      const testFarms = Array.from({ length: farmsCount }).fill({}) as Farm[];

      const spyGetFarms = jest
        .spyOn(apeSwapEthService, 'getFarms')
        .mockResolvedValue(testFarms);
      const spyUpdatePair = jest
        .spyOn(pairsService, 'saveOrUpdatePair')
        .mockResolvedValue(null);

      const web3 = {} as any;

      await pairsService.reloadPairs({ blockchainId, platform, web3 });

      expect(spyGetFarms).toBeCalledTimes(1);
      expect(spyUpdatePair).toBeCalledTimes(farmsCount);
    });
  });
});
