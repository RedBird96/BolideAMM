import { Injectable, Logger } from '@nestjs/common';
import { ERROR_CODES } from 'src/common/constants/error-codes';
import { LogicException } from 'src/common/logic.exception';
import { fromWei, toBN } from 'src/common/utils/big-number-utils';
import type { BigNumber } from 'src/common/utils/BigNumber';
import type Web3 from 'web3';

import type { TokenWithRateWeiAndAmount } from '../uniswap/uniswap-token-price.service';
import { VenusComputeApyService } from './venus-compute-apy.service';

@Injectable()
export class VenusBorrowPercentService {
  private readonly logger = new Logger(VenusBorrowPercentService.name);

  constructor(
    private readonly venusComputeApyService: VenusComputeApyService,
  ) {}

  async getStrategyPercents(data: {
    borrowedAmount: BigNumber;
    venusTokensBalanceBusd: Record<string, TokenWithRateWeiAndAmount>;
    web3: Web3;
  }): Promise<{
    currentPercent: number;
    totalBorrowLimit: number;
  }> {
    const { venusTokensBalanceBusd, borrowedAmount, web3 } = data;

    const venusTokensInfo =
      await this.venusComputeApyService.getAllVenusTokensData({
        web3,
      });

    try {
      let totalBorrowLimit = toBN('0');
      let sumSupplyUSD = toBN('0');

      for (const asset in venusTokensBalanceBusd) {
        const tokenBalanceBUSD = venusTokensBalanceBusd[asset].amountBUSD;

        if (tokenBalanceBUSD.gt(0)) {
          const marketDataEl = venusTokensInfo.find(
            (element) => element.platformSymbol === 'v' + asset,
          );

          const collateralFactor = fromWei(marketDataEl.collateralFactor);

          const borrowLimit = tokenBalanceBUSD.mul(collateralFactor);

          totalBorrowLimit = totalBorrowLimit.add(borrowLimit);
          sumSupplyUSD = sumSupplyUSD.add(tokenBalanceBUSD);
        }
      }

      const percentLimit = totalBorrowLimit.eq(0)
        ? toBN(0)
        : borrowedAmount.div(totalBorrowLimit).mul(toBN(100)).mul(toBN(-1));

      return {
        currentPercent: percentLimit.toNumber(),
        totalBorrowLimit: totalBorrowLimit.toNumber(),
      };
    } catch (error) {
      this.logger.error({
        message: 'getStrategyPercents -> calc',
        error,
      });

      throw new LogicException(ERROR_CODES.VENUS_CALC_PERCENT_LIMIT_ERROR);
    }
  }
}
