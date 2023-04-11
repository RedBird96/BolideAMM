import type { PLATFORMS } from 'src/common/constants/platforms';

export interface FarmLpPriceInfo {
  platform: PLATFORMS;
  pair: string;
  token1: string;
  token2: string;
  lpAddress: string;
  lpPrice: number;
  token1Liquidity: number;
  token1Price: number;
  token2Liquidity: number;
  token2Price: number;
  totalSupply: number;
}
