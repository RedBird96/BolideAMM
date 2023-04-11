import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import Decimal from 'decimal.js';
import { PLATFORMS } from 'src/common/constants/platforms';
import { BlockchainsService } from 'src/modules/blockchains/blockchains.service';
import { ContractsService } from 'src/modules/contracts/contracts.service';
import { StrategiesService } from 'src/modules/strategies/strategies.service';

import type { FarmAnalyticItem } from '../bnb-analytics.service';
import { BnbAnalyticsService } from '../bnb-analytics.service';
import { venusAllTokensMock as lends } from './venus-all-tokens-mock';

const strategiesServiceMock = {
  getStrategyById: jest.fn().mockResolvedValue({
    settings: {
      borrowLimitPercentage: 0.92,
    },
  }),
  getStrategiesByPairId: jest.fn().mockResolvedValue([]),
  deletePairFromAllStrategies: jest.fn().mockResolvedValue({}),
};

const blockchainId = 1;

let contractIterator = 0;
const lpContractsIds = [1, 2];
const toRemoveIds = [3, 4, 5];

const contractsServiceMock = {
  getTokenByName: jest.fn().mockResolvedValue({ id: 0 }),
  getTokensByNames: jest.fn().mockResolvedValue([{}, {}]),
  createOrUpdateContract: jest.fn().mockImplementation(() => ({
    dto: { id: lpContractsIds[contractIterator++] },
  })),
  getFarmContracts: jest
    .fn()
    .mockImplementation(() => [
      ...lpContractsIds.map((id) => ({ id, data: {} })),
      ...toRemoveIds.map((id) => ({ id, data: {} })),
    ]),
  deleteContract: jest.fn().mockResolvedValue({}),
};

const blockchainsServiceMock = {
  getBnbBlockchainSettings: jest.fn().mockResolvedValue({}),
};

describe('bnbAnalytics tests', () => {
  let app: TestingModule;
  let bnbAnalyticsService: BnbAnalyticsService;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [],
      controllers: [],
      providers: [
        BnbAnalyticsService,
        {
          provide: StrategiesService,
          useValue: strategiesServiceMock,
        },
        {
          provide: BlockchainsService,
          useValue: blockchainsServiceMock,
        },
        {
          provide: ContractsService,
          useValue: contractsServiceMock,
        },
      ],
    })
      .useMocker(() => ({}))
      .compile();

    bnbAnalyticsService = app.get<BnbAnalyticsService>(BnbAnalyticsService);
  });

  describe('getSuppliedDataTokens test', () => {
    it('getSuppliedDataTokens должен возвращать верный результат', () => {
      const suppliedDataTokens =
        bnbAnalyticsService.getSuppliedDataTokens(lends);

      expect(suppliedDataTokens.collateral.toString()).toBe('0.8');
      expect(suppliedDataTokens.maxBorrowUSD.toString()).toBe('8800.074384');
      expect(suppliedDataTokens.suppliedTokensApy.toString()).toBe(
        '1.4443333388241928683',
      );
      expect(suppliedDataTokens.totalAmountUSD.toString()).toBe('11000.09298');
    });

    afterEach(async () => {
      await jest.clearAllMocks();
    });
  });

  describe('calcLendingAndFarmmsApys tests', () => {
    const analytics: FarmAnalyticItem[] = [
      {
        farm: {
          platform: PLATFORMS.APESWAP,
          pair: 'FIL-BNB',
          token1: 'FIL',
          token2: 'BNB',
          lpAddress: '0xcAEC8648dbaC41b6504A8E408892931796D67d87',
          asset1Address: '0x0D8Ce2A99Bb6e3B7Db580eD848240e4a0F9aE153',
          asset2Address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
          pid: 142,
          isBorrowable: true,
        },
        farmLp: {
          lpPrice: 130.698_863_323_176_28,
          token1: 'FIL',
          token2: 'BNB',
          platform: PLATFORMS.APESWAP,
          pair: 'FIL-BNB',
          lpAddress: '0xcAEC8648dbaC41b6504A8E408892931796D67d87',
          token1Liquidity: 5.415_052_815_939_553,
          token1Price: 12.056_693_931_172_164,
          token2Liquidity: 0.196_325_611_166_855_4,
          token2Price: 333.177_258_491_602,
          totalSupply: 3818.384_628_884_997_3,
        },
        rewardInfo: {
          apr: 12.875_838_122_448_92,
          poolLiquidityUsd: 499_058.530_725_957_5,
          poolWeight: 0.002_901_864_227_928_245,
        },
      },
    ];

    it('вызов calcLendingAndFarmmsApys должен возврашать верные данные', async () => {
      jest
        .spyOn(bnbAnalyticsService, 'getLendToken')
        .mockImplementationOnce(() => ({
          platform: PLATFORMS.VENUS,
          totalBorrows: '46963.48080599390513987',
          totalBorrowsUsd: '570166.388625194667019487',
          totalSupply: '13031598.64298519',
          totalSupplyUsd: '3228106.704436247680394128',
          collateralFactor: '0.6',
          borrowApy: -5.671_954_066_716_393,
          supplyApy: 0.782_642_266_155,
          borrowVenusApy: '5.086048600864901902',
          supplyVenusApy: '0.880127666385342713',
          liquidity: '2663890.803444571509008327',
          tokenPrice: '12.140_633_08',
          borrowerCount: 268,
          supplierCount: 1070,
          platformAddress: '0xf91d58b5ae142dacc749f58a49fcbac340cb0343',
          platformSymbol: 'vFIL',
          address: '0x0D8Ce2A99Bb6e3B7Db580eD848240e4a0F9aE153',
          token: 'FIL',
        }));

      jest
        .spyOn(bnbAnalyticsService, 'getLendToken')
        .mockImplementationOnce(() => ({
          platform: PLATFORMS.VENUS,
          totalBorrows: '218071.57728110912839855',
          totalBorrowsUsd: '73309095.747929604679536017',
          totalSupply: '29833812.31925079',
          totalSupplyUsd: '217657212.186694276816943902',
          collateralFactor: '0.8',
          borrowApy: -4.112_745_434_961_114,
          supplyApy: 1.091_951_185_692,
          borrowVenusApy: '2.342130595127058517',
          supplyVenusApy: '0.782821007158422718',
          liquidity: '151685944.289695360192048222',
          tokenPrice: '336.169_879',
          borrowerCount: 10_049,
          supplierCount: 19_876,
          platformAddress: '0xa07c5b74c9b40447a954e1466938b865b6bbea36',
          platformSymbol: 'vBNB',
          address: null,
          token: 'BNB',
        }));

      jest
        .spyOn(bnbAnalyticsService, 'getSuppliedDataTokens')
        .mockImplementationOnce((): any => ({
          tokens: [
            { token: 'USDT', amount: 10_000 },
            { token: 'BUSD', amount: 1000 },
          ],
          totalAmountUSD: new Decimal(11_000.092_980_000_001),
          maxBorrowUSD: new Decimal(8800.074_384_000_001),
          collateral: new Decimal(0.8),
          suppliedTokensApy: new Decimal('1.4443333388241928716'),
        }));

      const result = await bnbAnalyticsService.calcLendingAndFarmmsApys({
        analytics,
        lends,
        lending: PLATFORMS.VENUS,
        strategyId: 0,
      });

      expect(result[0].borrowTokensApy.toString()).toBe(
        '-0.8671994724922811615',
      );
      expect(result[0].farmApy.toString()).toBe('9.4766168581224053356');
      expect(result[0].suppliedTokensApy.toString()).toBe(
        '1.4443333388241928716',
      );
      expect(result[0].totalApy.toString()).toBe('10.053750724454317046');
    });

    afterEach(async () => {
      await jest.clearAllMocks();
    });
  });

  describe('syncFarmsAndLpContracts tests', () => {
    const farms: any = lpContractsIds.map(() => ({}));

    beforeEach(() => {
      contractIterator = 0;
    });

    it('should create or update contract for each farm', async () => {
      const spy = jest.spyOn(contractsServiceMock, 'createOrUpdateContract');

      await bnbAnalyticsService.syncFarmsAndLpContracts(blockchainId, farms);

      expect(spy).toBeCalledTimes(farms.length);
    });

    it('should remove deleted pair from contracts and from strategies', async () => {
      const spyDeleteContract = jest.spyOn(
        contractsServiceMock,
        'deleteContract',
      );

      await bnbAnalyticsService.syncFarmsAndLpContracts(blockchainId, farms);

      expect(spyDeleteContract).toBeCalledTimes(toRemoveIds.length);

      for (const id of toRemoveIds) {
        expect(spyDeleteContract).toHaveBeenCalledWith(id);
      }
    });

    it('should not remove deleted pair from contracts if it is used by any strategy', async () => {
      const spyDeleteContract = jest.spyOn(
        contractsServiceMock,
        'deleteContract',
      );

      jest
        .spyOn(strategiesServiceMock, 'getStrategiesByPairId')
        .mockImplementation(() => [{}]);

      await bnbAnalyticsService.syncFarmsAndLpContracts(blockchainId, farms);

      expect(spyDeleteContract).toBeCalledTimes(0);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });
  });
});
