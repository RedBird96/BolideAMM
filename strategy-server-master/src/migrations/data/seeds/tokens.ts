import { Token } from '@bolide/swap-sdk';

type TokenList = Record<string, Token>;

const defineTokens = <T extends TokenList>(t: T) => t;

const MAINNET = 56;

// @docs https://github.com/pancakeswap/pancake-frontend/blob/develop/src/config/constants/tokens.ts#L14
export const mainnetTokens = defineTokens({
  BTC: new Token(
    MAINNET,
    '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
    18,
    'BTC',
    'Binance BTC',
  ),
  BUSD: new Token(
    MAINNET,
    '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    18,
    'BUSD',
    'Binance USD',
  ),
  BNB: new Token(
    MAINNET,
    '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    18,
    'BNB',
    'BNB',
  ),
  CAKE: new Token(
    MAINNET,
    '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82',
    18,
    'CAKE',
    'PancakeSwap Token',
  ),
  DAI: new Token(
    MAINNET,
    '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3',
    18,
    'DAI',
    'Dai Stablecoin',
  ),
  USDT: new Token(
    MAINNET,
    '0x55d398326f99059fF775485246999027B3197955',
    18,
    'USDT',
    'Tether USD',
  ),
  ETH: new Token(
    MAINNET,
    '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
    18,
    'ETH',
    'Binance-Peg Ethereum Token',
  ),
  USDC: new Token(
    MAINNET,
    '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    18,
    'USDC',
    'Binance-Peg USD Coin',
  ),
  LTC: new Token(
    MAINNET,
    '0x4338665CBB7B2485A8855A139b75D5e34AB0DB94',
    18,
    'LTC',
    'Binance-Peg Litecoin Token',
  ),
  ADA: new Token(
    MAINNET,
    '0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47',
    18,
    'ADA',
    'Binance-Peg Cardano Token',
  ),
  DOT: new Token(
    MAINNET,
    '0x7083609fCE4d1d8Dc0C979AAb8c869Ea2C873402',
    18,
    'DOT',
    'Binance-Peg Polkadot Token',
  ),
  LINK: new Token(
    MAINNET,
    '0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD',
    18,
    'LINK',
    'Binance-Peg Chainlink Token',
  ),
  XRP: new Token(
    MAINNET,
    '0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE',
    18,
    'XRP',
    'Binance-Peg XRP Token',
  ),
  BCH: new Token(
    MAINNET,
    '0x8fF795a6F4D97E7887C79beA79aba5cc76444aDf',
    18,
    'BCH',
    'Binance-Peg Bitcoin Cash Token',
  ),
  FIL: new Token(
    MAINNET,
    '0x0D8Ce2A99Bb6e3B7Db580eD848240e4a0F9aE153',
    18,
    'FIL',
    'Binance-Peg Filecoin Token',
  ),
  TRX: new Token(
    MAINNET,
    '0x85EAC5Ac2F758618dFa09bDbe0cf174e7d574D5B',
    18,
    'TRX',
    'TRON Token',
  ),
  BSW: new Token(
    MAINNET,
    '0x965F527D9159dCe6288a2219DB51fc6Eef120dD1',
    18,
    'BSW',
    'Biswap',
  ),
  XVS: new Token(
    MAINNET,
    '0xcF6BB5389c92Bdda8a3747Ddb454cB7a64626C63',
    18,
    'XVS',
    'Venus Token',
  ),
  SXP: new Token(
    MAINNET,
    '0x47BEAd2563dCBf3bF2c9407fEa4dC236fAbA485A',
    18,
    'SXP',
    'Swipe Token',
  ),
  DOGE: new Token(
    MAINNET,
    '0xbA2aE424d960c26247Dd6c32edC70B295c744C43',
    8,
    'DOGE',
    'Binance-Peg Dogecoin',
  ),
  BETH: new Token(
    MAINNET,
    '0x250632378E573c6Be1AC2f97Fcdf00515d0Aa91B',
    18,
    'BETH',
    'Binance Beacon ETH',
    'https://ethereum.org/en/eth2/beacon-chain/',
  ),
  TUSD: new Token(
    MAINNET,
    '0x14016E85a25aeb13065688cAFB43044C2ef86784',
    18,
    'TUSD',
    'Binance-Peg TrueUSD Token',
    'https://www.trueusd.com/',
  ),
});
