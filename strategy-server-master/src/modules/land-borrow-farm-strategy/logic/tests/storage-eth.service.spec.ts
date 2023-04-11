import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { PLATFORMS } from 'src/common/constants/platforms';
import { toBN, toWei, toWeiBN } from 'src/common/utils/big-number-utils';
import { BnbWeb3Service } from 'src/modules/bnb/bnb-web3.service';
import { UniswapEthService } from 'src/modules/bnb/uniswap/uniswap-eth.service';
import { ConfigService } from 'src/shared/services/config.service';

import { StorageEthService } from '../storage-eth.service';

const tokenPriceUsd = toBN(2);

const uniswapEthServiceMock = {
  getTokenPriceUSD: jest.fn().mockResolvedValue(toWei(tokenPriceUsd)),
};

describe('calcBoostingAmountValue', () => {
  let app: TestingModule;
  let storageEthService: StorageEthService;
  let bnbWeb3Service: BnbWeb3Service;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [],
      controllers: [],
      providers: [
        StorageEthService,
        {
          provide: UniswapEthService,
          useValue: uniswapEthServiceMock,
        },
        ConfigService,
        BnbWeb3Service,
      ],
    })
      .useMocker(() => ({}))
      .compile();

    storageEthService = app.get<StorageEthService>(StorageEthService);
    bnbWeb3Service = app.get<BnbWeb3Service>(BnbWeb3Service);
  });

  describe('calcAmountToPreserve tests', () => {
    const tokenAddress = '0x1';
    const depositedAmount = toWeiBN(20);
    const maxAmountUsdToPreserveOnStorage = 75;
    const limitsToPreserveOnStorage = [
      { maxAmountUsd: 10, percentToPreserve: 0.1 },
      { maxAmountUsd: 50, percentToPreserve: 0.3 },
      { maxAmountUsd: 30, percentToPreserve: 0.2 },
    ];

    const payload = {
      tokenAddress,
      depositedAmount,
      maxAmountUsdToPreserveOnStorage,
      limitsToPreserveOnStorage,
    };

    it('should convert deposited amount to BUSD', async () => {
      const spy = jest.spyOn(uniswapEthServiceMock, 'getTokenPriceUSD');

      const web3 = await bnbWeb3Service.createInstance();

      await storageEthService.calcAmountToPreserve({ ...payload, web3 });

      const results = spy.mock.calls[0][0];

      expect(results.asset).toBe(tokenAddress);
      expect(results.platform).toBe(PLATFORMS.PANCAKESWAP);
    });

    it('should return depositedAmount * percentToPreserve of an appropriate interval of limits', async () => {
      const web3 = await bnbWeb3Service.createInstance();

      const actualAmountToPreserve =
        await storageEthService.calcAmountToPreserve({ ...payload, web3 });

      const percentToPreserve = limitsToPreserveOnStorage[1].percentToPreserve;
      const expectedAmountToPreserve = depositedAmount.mul(
        toBN(percentToPreserve),
      );

      expect(actualAmountToPreserve).toEqual(expectedAmountToPreserve);
    });

    it('should return maxAmountToPreserveOnStorage if there are no an appropriate interval of limits', async () => {
      const web3 = await bnbWeb3Service.createInstance();

      const actualAmountToPreserve =
        await storageEthService.calcAmountToPreserve({
          ...payload,
          depositedAmount: toWeiBN(51),
          web3,
        });

      const expectedAmountToPreserve = toWeiBN(
        maxAmountUsdToPreserveOnStorage,
      ).div(tokenPriceUsd);

      expect(actualAmountToPreserve).toEqual(expectedAmountToPreserve);
    });
  });
});
