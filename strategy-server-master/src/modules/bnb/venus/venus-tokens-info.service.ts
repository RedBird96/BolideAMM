import { Injectable, Logger } from '@nestjs/common';
import { PLATFORMS } from 'src/common/constants/platforms';
import { toBN } from 'src/common/utils/big-number-utils';
import type Web3 from 'web3';

import { VenusComputeApyService } from './venus-compute-apy.service';
import type { VenusTokenInfo } from './venus-token-info.interface';

@Injectable()
export class VenusTokensInfoService {
  private readonly logger = new Logger(VenusTokensInfoService.name);

  constructor(
    private readonly venusComputeApyService: VenusComputeApyService,
  ) {}

  async getAllVenusTokensInfo(data: { web3: Web3 }): Promise<VenusTokenInfo[]> {
    this.logger.debug({ message: 'executing getAllVenusTokensInfo' });

    const { web3 } = data;

    const results = await this.venusComputeApyService.getAllVenusTokensData({
      web3,
    });

    const tokensInfo: VenusTokenInfo[] = [];

    for (const dataItem of results) {
      tokensInfo.push({
        platform: PLATFORMS.VENUS,
        totalBorrows: dataItem.totalBorrows2.toString(),
        totalBorrowsUsd: dataItem.totalBorrowsUsd.toString(),
        totalSupply: dataItem.totalSupply2.toString(),
        totalSupplyUsd: dataItem.totalSupplyUsd.toString(),
        collateralFactor: dataItem.collateralFactor
          .dividedBy(toBN(10).pow(18))
          .toString(),

        borrowApy: dataItem.borrowApy.toNumber(),
        supplyApy: dataItem.supplyApy.toNumber(),

        borrowVenusApy: dataItem.borrowVenusApy.toString(),
        supplyVenusApy: dataItem.supplyVenusApy.toString(),

        liquidity: dataItem.liquidity.toString(),
        tokenPrice: dataItem.tokenPrice.toString(),

        platformAddress: dataItem.vTokenAddress,
        platformSymbol: dataItem.platformSymbol,

        address: dataItem.address,
        token: dataItem.underlyingSymbol.toUpperCase().replace('BTCB', 'BTC'),
      });
    }

    return tokensInfo;
  }
}
