import type { PLATFORMS } from 'src/common/constants/platforms';

export interface VenusTokenInfo {
  platform: PLATFORMS.VENUS;
  totalBorrows: string;
  totalBorrowsUsd: string;
  totalSupply: string;
  totalSupplyUsd: string;
  collateralFactor: string;
  borrowApy: number;
  supplyApy: number;
  borrowVenusApy: string;
  supplyVenusApy: string;
  liquidity: string;
  tokenPrice: string;
  borrowerCount?: number;
  supplierCount?: number;
  platformAddress: string;
  platformSymbol: string;
  address: string;
  token: string;
}
