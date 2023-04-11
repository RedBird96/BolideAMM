import { TOKEN_ADDRESS } from './token-addresses';

export const PANCAKE_PATHS = {
  SXP: {
    BUSD: [TOKEN_ADDRESS.SXP, TOKEN_ADDRESS.BNB, TOKEN_ADDRESS.BUSD],
    USDT: [TOKEN_ADDRESS.SXP, TOKEN_ADDRESS.BNB, TOKEN_ADDRESS.USDT],
    USDC: [
      TOKEN_ADDRESS.SXP,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.BUSD,
      TOKEN_ADDRESS.USDC,
    ],
    DAI: [
      TOKEN_ADDRESS.SXP,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.BUSD,
      TOKEN_ADDRESS.DAI,
    ],
    BNB: [TOKEN_ADDRESS.SXP, TOKEN_ADDRESS.BNB],
    BLID: [
      TOKEN_ADDRESS.SXP,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.USDT,
      TOKEN_ADDRESS.BLID,
    ],
  },
  ETH: {
    BUSD: [TOKEN_ADDRESS.ETH, TOKEN_ADDRESS.BNB, TOKEN_ADDRESS.BUSD],
    USDT: [TOKEN_ADDRESS.ETH, TOKEN_ADDRESS.BNB, TOKEN_ADDRESS.USDT],
    USDC: [TOKEN_ADDRESS.ETH, TOKEN_ADDRESS.USDC],
    DAI: [
      TOKEN_ADDRESS.ETH,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.BUSD,
      TOKEN_ADDRESS.DAI,
    ],
    BLID: [
      TOKEN_ADDRESS.ETH,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.USDT,
      TOKEN_ADDRESS.BLID,
    ],
  },
  CAKE: {
    BUSD: [TOKEN_ADDRESS.CAKE, TOKEN_ADDRESS.BUSD],
    USDT: [TOKEN_ADDRESS.CAKE, TOKEN_ADDRESS.USDT],
    USDC: [
      TOKEN_ADDRESS.CAKE,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.BUSD,
      TOKEN_ADDRESS.USDC,
    ],
    DAI: [
      TOKEN_ADDRESS.CAKE,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.BUSD,
      TOKEN_ADDRESS.DAI,
    ],
    BLID: [
      TOKEN_ADDRESS.CAKE,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.USDT,
      TOKEN_ADDRESS.BLID,
    ],
  },
  BNB: {
    BUSD: [TOKEN_ADDRESS.BNB, TOKEN_ADDRESS.BUSD],
    USDT: [TOKEN_ADDRESS.BNB, TOKEN_ADDRESS.USDT],
    USDC: [TOKEN_ADDRESS.BNB, TOKEN_ADDRESS.BUSD, TOKEN_ADDRESS.USDC],
    DAI: [TOKEN_ADDRESS.BNB, TOKEN_ADDRESS.BUSD, TOKEN_ADDRESS.DAI],
    SXP: [TOKEN_ADDRESS.BNB, TOKEN_ADDRESS.SXP],
    FIL: [TOKEN_ADDRESS.BNB, TOKEN_ADDRESS.FIL],
    BLID: [TOKEN_ADDRESS.BNB, TOKEN_ADDRESS.USDT, TOKEN_ADDRESS.BLID],
  },
  XVS: {
    BUSD: [TOKEN_ADDRESS.XVS, TOKEN_ADDRESS.BNB, TOKEN_ADDRESS.BUSD],
    USDT: [TOKEN_ADDRESS.XVS, TOKEN_ADDRESS.BNB, TOKEN_ADDRESS.USDT],
    USDC: [
      TOKEN_ADDRESS.XVS,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.BUSD,
      TOKEN_ADDRESS.USDC,
    ],
    DAI: [
      TOKEN_ADDRESS.XVS,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.BUSD,
      TOKEN_ADDRESS.DAI,
    ],
    BLID: [
      TOKEN_ADDRESS.XVS,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.USDT,
      TOKEN_ADDRESS.BLID,
    ],
  },
  USDC: {
    BUSD: [TOKEN_ADDRESS.USDC, TOKEN_ADDRESS.BUSD],
    USDT: [TOKEN_ADDRESS.USDC, TOKEN_ADDRESS.USDT],
    ETH: [TOKEN_ADDRESS.USDC, TOKEN_ADDRESS.ETH],
    DAI: [TOKEN_ADDRESS.USDC, TOKEN_ADDRESS.BUSD, TOKEN_ADDRESS.DAI],
    BLID: [
      TOKEN_ADDRESS.USDC,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.USDT,
      TOKEN_ADDRESS.BLID,
    ],
  },
  ADA: {
    BUSD: [TOKEN_ADDRESS.ADA, TOKEN_ADDRESS.BUSD],
    USDT: [TOKEN_ADDRESS.ADA, TOKEN_ADDRESS.USDT],
    BNB: [TOKEN_ADDRESS.ADA, TOKEN_ADDRESS.BNB],
    USDC: [
      TOKEN_ADDRESS.ADA,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.BUSD,
      TOKEN_ADDRESS.USDC,
    ],
    DAI: [
      TOKEN_ADDRESS.ADA,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.BUSD,
      TOKEN_ADDRESS.DAI,
    ],
    BLID: [
      TOKEN_ADDRESS.ADA,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.USDT,
      TOKEN_ADDRESS.BLID,
    ],
  },
  BUSD: {
    USDC: [TOKEN_ADDRESS.BUSD, TOKEN_ADDRESS.USDC],
    DAI: [TOKEN_ADDRESS.BUSD, TOKEN_ADDRESS.DAI],
    USDT: [TOKEN_ADDRESS.BUSD, TOKEN_ADDRESS.USDT],
    BNB: [TOKEN_ADDRESS.BUSD, TOKEN_ADDRESS.BNB],
    SXP: [TOKEN_ADDRESS.BUSD, TOKEN_ADDRESS.BNB, TOKEN_ADDRESS.SXP],
    BLID: [
      TOKEN_ADDRESS.BUSD,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.USDT,
      TOKEN_ADDRESS.BLID,
    ],
  },
  USDT: {
    BUSD: [TOKEN_ADDRESS.USDT, TOKEN_ADDRESS.BUSD],
    BLID: [TOKEN_ADDRESS.USDT, TOKEN_ADDRESS.BLID],
    USDC: [TOKEN_ADDRESS.USDT, TOKEN_ADDRESS.BUSD, TOKEN_ADDRESS.USDC],
    DAI: [TOKEN_ADDRESS.USDT, TOKEN_ADDRESS.BUSD, TOKEN_ADDRESS.DAI],
  },
  DOGE: {
    BUSD: [TOKEN_ADDRESS.DOGE, TOKEN_ADDRESS.BNB, TOKEN_ADDRESS.BUSD],
    USDT: [TOKEN_ADDRESS.DOGE, TOKEN_ADDRESS.BNB, TOKEN_ADDRESS.USDT],
    USDC: [
      TOKEN_ADDRESS.DOGE,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.BUSD,
      TOKEN_ADDRESS.USDC,
    ],
    DAI: [
      TOKEN_ADDRESS.DOGE,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.BUSD,
      TOKEN_ADDRESS.DAI,
    ],
    BNB: [TOKEN_ADDRESS.DOGE, TOKEN_ADDRESS.BNB],
    BLID: [
      TOKEN_ADDRESS.DOGE,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.USDT,
      TOKEN_ADDRESS.BLID,
    ],
  },
  FIL: {
    BUSD: [TOKEN_ADDRESS.FIL, TOKEN_ADDRESS.BNB, TOKEN_ADDRESS.BUSD],
    USDT: [TOKEN_ADDRESS.FIL, TOKEN_ADDRESS.BNB, TOKEN_ADDRESS.USDT],
    USDC: [
      TOKEN_ADDRESS.FIL,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.BUSD,
      TOKEN_ADDRESS.USDC,
    ],
    DAI: [
      TOKEN_ADDRESS.FIL,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.BUSD,
      TOKEN_ADDRESS.DAI,
    ],
    BNB: [TOKEN_ADDRESS.FIL, TOKEN_ADDRESS.BNB],
    BLID: [
      TOKEN_ADDRESS.FIL,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.USDT,
      TOKEN_ADDRESS.BLID,
    ],
  },
  LTC: {
    BUSD: [TOKEN_ADDRESS.LTC, TOKEN_ADDRESS.BNB, TOKEN_ADDRESS.BUSD],
    USDT: [TOKEN_ADDRESS.LTC, TOKEN_ADDRESS.BNB, TOKEN_ADDRESS.USDT],
    USDC: [
      TOKEN_ADDRESS.LTC,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.BUSD,
      TOKEN_ADDRESS.USDC,
    ],
    DAI: [
      TOKEN_ADDRESS.LTC,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.BUSD,
      TOKEN_ADDRESS.DAI,
    ],
    BNB: [TOKEN_ADDRESS.LTC, TOKEN_ADDRESS.BNB],
    BLID: [
      TOKEN_ADDRESS.LTC,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.USDT,
      TOKEN_ADDRESS.BLID,
    ],
  },
  BCH: {
    BUSD: [TOKEN_ADDRESS.BCH, TOKEN_ADDRESS.BNB, TOKEN_ADDRESS.BUSD],
    USDT: [TOKEN_ADDRESS.BCH, TOKEN_ADDRESS.USDT],
    BNB: [TOKEN_ADDRESS.BCH, TOKEN_ADDRESS.BNB],
    BLID: [
      TOKEN_ADDRESS.BCH,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.USDT,
      TOKEN_ADDRESS.BLID,
    ],
  },
  BETH: {
    BUSD: [TOKEN_ADDRESS.BETH, TOKEN_ADDRESS.ETH, TOKEN_ADDRESS.BUSD],
    USDT: [TOKEN_ADDRESS.BETH, TOKEN_ADDRESS.USDT],
    BNB: [TOKEN_ADDRESS.BETH, TOKEN_ADDRESS.BNB],
    BLID: [
      TOKEN_ADDRESS.BETH,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.USDT,
      TOKEN_ADDRESS.BLID,
    ],
  },
  XRP: {
    BUSD: [TOKEN_ADDRESS.XRP, TOKEN_ADDRESS.BNB, TOKEN_ADDRESS.BUSD],
    USDT: [TOKEN_ADDRESS.XRP, TOKEN_ADDRESS.BNB, TOKEN_ADDRESS.USDT],
    USDC: [
      TOKEN_ADDRESS.XRP,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.BUSD,
      TOKEN_ADDRESS.USDC,
    ],
    DAI: [
      TOKEN_ADDRESS.XRP,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.BUSD,
      TOKEN_ADDRESS.DAI,
    ],
    BNB: [TOKEN_ADDRESS.XRP, TOKEN_ADDRESS.BNB],
    BLID: [
      TOKEN_ADDRESS.XRP,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.USDT,
      TOKEN_ADDRESS.BLID,
    ],
  },
  BANANA: {
    BUSD: [TOKEN_ADDRESS.BANANA, TOKEN_ADDRESS.BNB, TOKEN_ADDRESS.BUSD],
    USDT: [TOKEN_ADDRESS.BANANA, TOKEN_ADDRESS.BNB, TOKEN_ADDRESS.USDT],
    USDC: [TOKEN_ADDRESS.BANANA, TOKEN_ADDRESS.BNB, TOKEN_ADDRESS.USDC],
    DAI: [TOKEN_ADDRESS.BANANA, TOKEN_ADDRESS.BNB, TOKEN_ADDRESS.DAI],
    BNB: [TOKEN_ADDRESS.BANANA, TOKEN_ADDRESS.BNB],
    BLID: [
      TOKEN_ADDRESS.BANANA,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.USDT,
      TOKEN_ADDRESS.BLID,
    ],
  },
  MATIC: {
    BUSD: [TOKEN_ADDRESS.MATIC, TOKEN_ADDRESS.BNB, TOKEN_ADDRESS.BUSD],
    USDT: [TOKEN_ADDRESS.MATIC, TOKEN_ADDRESS.BNB, TOKEN_ADDRESS.USDT],
    USDC: [
      TOKEN_ADDRESS.MATIC,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.BUSD,
      TOKEN_ADDRESS.USDC,
    ],
    DAI: [
      TOKEN_ADDRESS.MATIC,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.BUSD,
      TOKEN_ADDRESS.DAI,
    ],
    BNB: [TOKEN_ADDRESS.MATIC, TOKEN_ADDRESS.BNB],
    BLID: [
      TOKEN_ADDRESS.MATIC,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.USDT,
      TOKEN_ADDRESS.BLID,
    ],
  },
  DOT: {
    BUSD: [TOKEN_ADDRESS.DOT, TOKEN_ADDRESS.BNB, TOKEN_ADDRESS.BUSD],
    USDT: [TOKEN_ADDRESS.DOT, TOKEN_ADDRESS.BNB, TOKEN_ADDRESS.USDT],
    USDC: [
      TOKEN_ADDRESS.DOT,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.BUSD,
      TOKEN_ADDRESS.USDC,
    ],
    DAI: [
      TOKEN_ADDRESS.DOT,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.BUSD,
      TOKEN_ADDRESS.DAI,
    ],
    BNB: [TOKEN_ADDRESS.DOT, TOKEN_ADDRESS.BNB],
    BLID: [
      TOKEN_ADDRESS.DOT,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.USDT,
      TOKEN_ADDRESS.BLID,
    ],
  },
  DAI: {
    BUSD: [TOKEN_ADDRESS.DAI, TOKEN_ADDRESS.BUSD],
    USDT: [TOKEN_ADDRESS.DAI, TOKEN_ADDRESS.BUSD, TOKEN_ADDRESS.USDT],
    USDC: [TOKEN_ADDRESS.DAI, TOKEN_ADDRESS.BUSD, TOKEN_ADDRESS.USDC],
    BNB: [TOKEN_ADDRESS.DAI, TOKEN_ADDRESS.BNB],
    BLID: [
      TOKEN_ADDRESS.DAI,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.USDT,
      TOKEN_ADDRESS.BLID,
    ],
  },
  TRX: {
    BUSD: [TOKEN_ADDRESS.TRX, TOKEN_ADDRESS.BUSD],
    USDT: [TOKEN_ADDRESS.TRX, TOKEN_ADDRESS.BUSD, TOKEN_ADDRESS.USDT],
    USDC: [TOKEN_ADDRESS.TRX, TOKEN_ADDRESS.BUSD, TOKEN_ADDRESS.USDC],
    DAI: [TOKEN_ADDRESS.TRX, TOKEN_ADDRESS.BUSD, TOKEN_ADDRESS.DAI],
    BNB: [TOKEN_ADDRESS.TRX, TOKEN_ADDRESS.BNB],
    BLID: [
      TOKEN_ADDRESS.TRX,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.USDT,
      TOKEN_ADDRESS.BLID,
    ],
  },
  LINK: {
    BUSD: [TOKEN_ADDRESS.LINK, TOKEN_ADDRESS.BNB, TOKEN_ADDRESS.BUSD],
    USDT: [TOKEN_ADDRESS.LINK, TOKEN_ADDRESS.BNB, TOKEN_ADDRESS.USDT],
    USDC: [
      TOKEN_ADDRESS.LINK,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.BUSD,
      TOKEN_ADDRESS.USDC,
    ],
    DAI: [
      TOKEN_ADDRESS.LINK,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.BUSD,
      TOKEN_ADDRESS.DAI,
    ],
    BNB: [TOKEN_ADDRESS.LINK, TOKEN_ADDRESS.BNB],
    BLID: [
      TOKEN_ADDRESS.LINK,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.USDT,
      TOKEN_ADDRESS.BLID,
    ],
  },
  BTC: {
    BUSD: [TOKEN_ADDRESS.BTC, TOKEN_ADDRESS.BNB, TOKEN_ADDRESS.BUSD],
    USDT: [TOKEN_ADDRESS.BTC, TOKEN_ADDRESS.BNB, TOKEN_ADDRESS.USDT],
    USDC: [TOKEN_ADDRESS.BTC, TOKEN_ADDRESS.BUSD, TOKEN_ADDRESS.USDC],
    DAI: [TOKEN_ADDRESS.BTC, TOKEN_ADDRESS.BUSD, TOKEN_ADDRESS.DAI],
    BNB: [TOKEN_ADDRESS.BTC, TOKEN_ADDRESS.BNB],
    BLID: [
      TOKEN_ADDRESS.BTC,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.USDT,
      TOKEN_ADDRESS.BLID,
    ],
  },
  TUSD: {
    BUSD: [TOKEN_ADDRESS.TUSD, TOKEN_ADDRESS.BNB, TOKEN_ADDRESS.BUSD],
    USDT: [TOKEN_ADDRESS.TUSD, TOKEN_ADDRESS.BNB, TOKEN_ADDRESS.USDT],
    BNB: [TOKEN_ADDRESS.TUSD, TOKEN_ADDRESS.BNB],
    BLID: [
      TOKEN_ADDRESS.TUSD,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.USDT,
      TOKEN_ADDRESS.BLID,
    ],
  },
  BSW: {
    BUSD: [TOKEN_ADDRESS.BSW, TOKEN_ADDRESS.BNB, TOKEN_ADDRESS.BUSD],
    USDT: [TOKEN_ADDRESS.BSW, TOKEN_ADDRESS.BNB, TOKEN_ADDRESS.USDT],
    USDC: [
      TOKEN_ADDRESS.BSW,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.BUSD,
      TOKEN_ADDRESS.USDC,
    ],
    DAI: [
      TOKEN_ADDRESS.BSW,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.USDT,
      TOKEN_ADDRESS.DAI,
    ],
    BLID: [
      TOKEN_ADDRESS.BSW,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.USDT,
      TOKEN_ADDRESS.BLID,
    ],
  },
  BLID: {
    BUSD: [
      TOKEN_ADDRESS.BLID,
      TOKEN_ADDRESS.USDT,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.BUSD,
    ],
    USDT: [TOKEN_ADDRESS.BLID, TOKEN_ADDRESS.USDT],
    BNB: [TOKEN_ADDRESS.BLID, TOKEN_ADDRESS.USDT, TOKEN_ADDRESS.BNB],
    BETH: [
      TOKEN_ADDRESS.BLID,
      TOKEN_ADDRESS.USDT,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.BETH,
    ],
    BCH: [
      TOKEN_ADDRESS.BLID,
      TOKEN_ADDRESS.USDT,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.BCH,
    ],
    LTC: [
      TOKEN_ADDRESS.BLID,
      TOKEN_ADDRESS.USDT,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.LTC,
    ],
    FIL: [
      TOKEN_ADDRESS.BLID,
      TOKEN_ADDRESS.USDT,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.FIL,
    ],
    DOGE: [
      TOKEN_ADDRESS.BLID,
      TOKEN_ADDRESS.USDT,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.DOGE,
    ],
    ADA: [
      TOKEN_ADDRESS.BLID,
      TOKEN_ADDRESS.USDT,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.ADA,
    ],
    USDC: [
      TOKEN_ADDRESS.BLID,
      TOKEN_ADDRESS.USDT,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.USDC,
    ],
    XVS: [
      TOKEN_ADDRESS.BLID,
      TOKEN_ADDRESS.USDT,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.XVS,
    ],
    ETH: [
      TOKEN_ADDRESS.BLID,
      TOKEN_ADDRESS.USDT,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.ETH,
    ],
    SXP: [
      TOKEN_ADDRESS.BLID,
      TOKEN_ADDRESS.USDT,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.SXP,
    ],
    TUSD: [
      TOKEN_ADDRESS.BLID,
      TOKEN_ADDRESS.USDT,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.TUSD,
    ],
    DOT: [
      TOKEN_ADDRESS.BLID,
      TOKEN_ADDRESS.USDT,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.DOT,
    ],
    TRX: [
      TOKEN_ADDRESS.BLID,
      TOKEN_ADDRESS.USDT,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.TRX,
    ],
    DAI: [
      TOKEN_ADDRESS.BLID,
      TOKEN_ADDRESS.USDT,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.DAI,
    ],
    LINK: [
      TOKEN_ADDRESS.BLID,
      TOKEN_ADDRESS.USDT,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.LINK,
    ],
    CAKE: [
      TOKEN_ADDRESS.BLID,
      TOKEN_ADDRESS.USDT,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.CAKE,
    ],
    BTC: [
      TOKEN_ADDRESS.BLID,
      TOKEN_ADDRESS.USDT,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.BTC,
    ],
    XRP: [
      TOKEN_ADDRESS.BLID,
      TOKEN_ADDRESS.USDT,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.XRP,
    ],
    MATIC: [
      TOKEN_ADDRESS.BLID,
      TOKEN_ADDRESS.USDT,
      TOKEN_ADDRESS.BNB,
      TOKEN_ADDRESS.MATIC,
    ],
  },
};