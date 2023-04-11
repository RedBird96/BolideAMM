import type { PLATFORMS } from 'src/common/constants/platforms';

export interface Farm {
  platform: PLATFORMS;
  pair: string;
  token1: string;
  token2: string;
  lpAddress: string;
  asset1Address: string;
  asset2Address: string;
  pid: number;
  isBorrowable: boolean;
}
