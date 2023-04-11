/* eslint-disable @typescript-eslint/naming-convention */
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { PLATFORMS } from 'src/common/constants/platforms';
import { toBN } from 'src/common/utils/big-number-utils';
import { TOKEN_NAMES } from 'src/modules/contracts/constants/token-names';

import { LbfAnalyticsService } from '../lbf-analytics.service';

const staked = {
  'BNB-LINK_PANCAKESWAP#BNB': toBN('0.601249536451890324303952345119070848'),
  'BNB-LINK_PANCAKESWAP#LINK': toBN('21.468999243478007163652357692074772672'),
  'BTC-BNB_PANCAKESWAP#BTC': toBN('0.008045859778615158086349540466404156'),
  'BTC-BNB_PANCAKESWAP#BNB': toBN('0.578742535447483392558974438427182037'),
  'XRP-BNB_PANCAKESWAP#XRP': toBN('490.685505528977882804970774959781155908'),
  'XRP-BNB_PANCAKESWAP#BNB': toBN('0.588935929459782095597331252725627484'),
  'SXP-BNB_PANCAKESWAP#SXP': toBN('475.847519368985549859665353058509311528'),
  'SXP-BNB_PANCAKESWAP#BNB': toBN('0.596063735579017988605564023623465352'),
  'LTC-BNB_PANCAKESWAP#LTC': toBN('2.660966049629966926794055333257688915'),
  'LTC-BNB_PANCAKESWAP#BNB': toBN('0.539691086602022093447285471179223393'),
  'BTC-BNB_BISWAP#BTC': toBN('0.007245586388195155739496130361105194'),
  'BTC-BNB_BISWAP#BNB': toBN('0.521125665921428379458089045479297883'),
  'ETH-BNB_BISWAP#ETH': toBN('0.096025891671878766053687062686593604'),
  'ETH-BNB_BISWAP#BNB': toBN('0.510510904557664614208735880815054011'),
  'XRP-BNB_BISWAP#XRP': toBN('529.847335818208734092473170263862957606'),
  'XRP-BNB_BISWAP#BNB': toBN('0.635786779903399132509992370515479928'),
  'SXP-BNB_BISWAP#SXP': toBN('476.316339044676797019228750245418963522'),
  'SXP-BNB_BISWAP#BNB': toBN('0.596669471241142451713729002354006124'),
  'BNB-LINK_BISWAP#BNB': toBN('0.545855057630233363428889772155545238'),
  'BNB-LINK_BISWAP#LINK': toBN('19.493232424363620380113489509113158091'),
};

const tokensPriceBusdResults = {
  BNB: {
    asset: 'BNB',
    platform: 'PANCAKESWAP',
    decimals: 18,
    assetToAddress: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    assetTo: 'BUSD',
    routerAddress: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    path: [
      '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
      '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    ],
    rate: toBN('274294884517530697060'),
    rateWei: toBN('274.29488451753069706'),
    amountBUSD: toBN(
      '-10.02009255113102763495906570245290596393550461323874526',
    ),
  },
  SXP: {
    asset: 'SXP',
    platform: 'PANCAKESWAP',
    decimals: 18,
    assetToAddress: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    assetTo: 'BUSD',
    routerAddress: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    address: '0x47BEAd2563dCBf3bF2c9407fEa4dC236fAbA485A',
    path: [
      '0x47BEAd2563dCBf3bF2c9407fEa4dC236fAbA485A',
      '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
      '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    ],
    rate: toBN('343101311403003371'),
    rateWei: toBN('0.343101311403003371'),
    amountBUSD: toBN('9.39430893669276866602120915035677032552646865342953288'),
  },
  DOT: {
    asset: 'DOT',
    platform: 'PANCAKESWAP',
    decimals: 18,
    assetToAddress: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    assetTo: 'BUSD',
    routerAddress: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    address: '0x7083609fCE4d1d8Dc0C979AAb8c869Ea2C873402',
    path: [
      '0x7083609fCE4d1d8Dc0C979AAb8c869Ea2C873402',
      '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
      '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    ],
    rate: toBN('6824037572508564282'),
    rateWei: toBN('6.824037572508564282'),
    amountBUSD: toBN('-7.535279982090326016944021139e-8'),
  },
  LTC: {
    asset: 'LTC',
    platform: 'PANCAKESWAP',
    decimals: 18,
    assetToAddress: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    assetTo: 'BUSD',
    routerAddress: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    address: '0x4338665CBB7B2485A8855A139b75D5e34AB0DB94',
    path: [
      '0x4338665CBB7B2485A8855A139b75D5e34AB0DB94',
      '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
      '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    ],
    rate: toBN('55515013386629792949'),
    rateWei: toBN('55.515013386629792949'),
    amountBUSD: toBN(
      '-5.009943600016674170101835304296082604017829768097581215',
    ),
  },
  BCH: {
    asset: 'BCH',
    platform: 'PANCAKESWAP',
    decimals: 18,
    assetToAddress: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    assetTo: 'BUSD',
    routerAddress: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    address: '0x8fF795a6F4D97E7887C79beA79aba5cc76444aDf',
    path: [
      '0x8fF795a6F4D97E7887C79beA79aba5cc76444aDf',
      '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
      '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    ],
    rate: toBN('116319103696420812219'),
    rateWei: toBN('116.319103696420812219'),
    amountBUSD: toBN('0.774359739584159559216899288447068365'),
  },
  LINK: {
    asset: 'LINK',
    platform: 'PANCAKESWAP',
    decimals: 18,
    assetToAddress: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    assetTo: 'BUSD',
    routerAddress: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    address: '0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD',
    path: [
      '0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD',
      '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
      '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    ],
    rate: toBN('7696919117332411679'),
    rateWei: toBN('7.696919117332411679'),
    amountBUSD: toBN(
      '-8.226872274149702098514143836190478449485195978286826956',
    ),
  },
  BTC: {
    asset: 'BTC',
    platform: 'PANCAKESWAP',
    decimals: 18,
    assetToAddress: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    assetTo: 'BUSD',
    routerAddress: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    address: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
    path: [
      '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
      '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
      '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    ],
    rate: toBN('1.9611381821895605287801e+22'),
    rateWei: toBN('19611.381821895605287801'),
    amountBUSD: toBN(
      '3.443414702441890847577237048382139466163919952725536932',
    ),
  },
  ADA: {
    asset: 'ADA',
    platform: 'PANCAKESWAP',
    decimals: 18,
    assetToAddress: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    assetTo: 'BUSD',
    routerAddress: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    address: '0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47',
    path: [
      '0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47',
      '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    ],
    rate: toBN('462534382954377238'),
    rateWei: toBN('0.462534382954377238'),
    amountBUSD: toBN('-0.000001228110352028283281923704708356'),
  },
  XRP: {
    asset: 'XRP',
    platform: 'PANCAKESWAP',
    decimals: 18,
    assetToAddress: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    assetTo: 'BUSD',
    routerAddress: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    address: '0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE',
    path: [
      '0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE',
      '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
      '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    ],
    rate: toBN('329172551492511006'),
    rateWei: toBN('0.329172551492511006'),
    amountBUSD: toBN(
      '-7.531087261290832467493508234918375487113060631401708904',
    ),
  },
  ETH: {
    asset: 'ETH',
    platform: 'PANCAKESWAP',
    decimals: 18,
    assetToAddress: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    assetTo: 'BUSD',
    routerAddress: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    address: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
    path: [
      '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
      '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
      '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    ],
    rate: toBN('1.441170174087754010482e+21'),
    rateWei: toBN('1441.170174087754010482'),
    amountBUSD: toBN(
      '15.920591040789079692370912574135258387493097462544569472',
    ),
  },
  FIL: {
    asset: 'FIL',
    platform: 'PANCAKESWAP',
    decimals: 18,
    assetToAddress: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    assetTo: 'BUSD',
    routerAddress: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    address: '0x0D8Ce2A99Bb6e3B7Db580eD848240e4a0F9aE153',
    path: [
      '0x0D8Ce2A99Bb6e3B7Db580eD848240e4a0F9aE153',
      '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
      '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    ],
    rate: toBN('5692685416072486794'),
    rateWei: toBN('5.692685416072486794'),
    amountBUSD: toBN('-0.00047154103542134897847313562853651'),
  },
  BLID: {
    asset: 'BLID',
    platform: 'PANCAKESWAP',
    decimals: 18,
    assetToAddress: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    assetTo: 'BUSD',
    routerAddress: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    address: '0x766AFcf83Fd5eaf884B3d529b432CA27A6d84617',
    path: [
      '0x766AFcf83Fd5eaf884B3d529b432CA27A6d84617',
      '0x55d398326f99059fF775485246999027B3197955',
      '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
      '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    ],
    rate: toBN('23939495092986694'),
    rateWei: toBN('0.023939495092986694'),
    amountBUSD: toBN('30.168640975564455319072734945964143794'),
  },
};

describe('LbfAnalyticsService tests', () => {
  let app: TestingModule;
  let lbfAnalyticsService: LbfAnalyticsService;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [],
      controllers: [],
      providers: [LbfAnalyticsService],
    })
      .useMocker(() => ({}))
      .compile();

    lbfAnalyticsService = app.get<LbfAnalyticsService>(LbfAnalyticsService);
  });

  describe('LbfAnalyticsService.calcstakedPortfolio tests', () => {
    it('результат должен быть верным', () => {
      const result = lbfAnalyticsService.calcStakedPortfolio({
        staked,
        tokensPriceBusdResults,
      });

      expect(
        result.pairs[PLATFORMS.BISWAP][
          `${TOKEN_NAMES.BNB}-${TOKEN_NAMES.LINK}`
        ][TOKEN_NAMES.BNB],
      ).toBeDefined();

      expect(
        result.pairs[PLATFORMS.BISWAP][
          `${TOKEN_NAMES.BNB}-${TOKEN_NAMES.LINK}`
        ][TOKEN_NAMES.BNB].amountBUSD.toString(),
      ).toBe('149.725250');

      expect(
        result.pairs[PLATFORMS.BISWAP][
          `${TOKEN_NAMES.BNB}-${TOKEN_NAMES.LINK}`
        ][TOKEN_NAMES.BNB].amount.toString(),
      ).toBe('0.545855');

      expect(
        result.pairs[PLATFORMS.BISWAP][
          `${TOKEN_NAMES.BNB}-${TOKEN_NAMES.LINK}`
        ][TOKEN_NAMES.LINK],
      ).toBeDefined();

      expect(
        result.pairs[PLATFORMS.BISWAP][`${TOKEN_NAMES.BTC}-${TOKEN_NAMES.BNB}`][
          TOKEN_NAMES.BNB
        ],
      ).toBeDefined();

      expect(
        result.pairs[PLATFORMS.BISWAP][`${TOKEN_NAMES.BTC}-${TOKEN_NAMES.BNB}`][
          TOKEN_NAMES.BTC
        ],
      ).toBeDefined();

      expect(result.total[PLATFORMS.BISWAP].toString()).toBe('1539.113735');

      expect(result.total[PLATFORMS.PANCAKESWAP].toString()).toBe(
        '1592.282892',
      );
    });
  });
});
