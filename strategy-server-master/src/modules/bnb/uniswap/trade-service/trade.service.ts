import type { Currency, Fraction } from '@bolide/swap-sdk';
import {
  CurrencyAmount,
  Percent,
  SWAP_NAME,
  TokenAmount,
  Trade,
} from '@bolide/swap-sdk';
import { Injectable, Logger } from '@nestjs/common';
import { PLATFORMS } from 'src/common/constants/platforms';
import { fromWeiToStr, safeBN } from 'src/common/utils/big-number-utils';
import type { BigNumber } from 'src/common/utils/BigNumber';

import { PairsService } from './pairs.service';
import { TokenService } from './token.service';
import { isTradeBetter } from './utils/trades';
import {
  BETTER_TRADE_LESS_HOPS_THRESHOLD,
  INPUT_FRACTION_AFTER_FEE,
  MAX_HOPS,
  MAX_NUM_RESULTS,
  ONE_BIPS,
  ONE_HUNDRED_PERCENT,
} from './utils/utils';

const SWAP_MAPPER = {
  [PLATFORMS.PANCAKESWAP]: SWAP_NAME.pancakeswap,
  [PLATFORMS.APESWAP]: SWAP_NAME.apeswap,
  [PLATFORMS.BISWAP]: SWAP_NAME.biswap,
};

const SMALL_PRICE_IMPACT = '<0.01%';

@Injectable()
export class TradeService {
  private readonly logger = new Logger(TradeService.name);

  constructor(
    private readonly pairsService: PairsService,
    private readonly tokenService: TokenService,
  ) {}

  public async getProfitTrade(data: {
    token1Name: string;
    token2Name: string;
    amount: BigNumber;
    platform?: PLATFORMS;
    isReverseSwap?: boolean;
    uid?: string;
    blockchainId: number;
    isJustPrice?: boolean;
  }) {
    if (!data.isJustPrice) {
      this.logger.debug({
        message: 'executing getProfitTrade',
        token1Name: data.token1Name,
        token2Name: data.token2Name,
        amount: fromWeiToStr(data.amount),
        platform: data.platform,
        isReverseSwap: data.isReverseSwap,
        blockchainId: data.blockchainId,
        isJustPrice: data.isJustPrice,
        uid: data.uid,
      });
    }

    const bestTrade = await this.getTrade(data);
    const { route, inputAmount, outputAmount } = bestTrade;
    const path = route.path.map((el) => el.address);
    const pathSymbol = route.path.map((el) => el.symbol);

    if (!data.isJustPrice) {
      this.logger.debug({
        message: 'getProfitPath > best trade',
        swapName: route.pairs[0].swapName,
        path,
        pathSymbol,
        inputAmount: inputAmount.raw.toString(),
        outputAmount: outputAmount.raw.toString(),
        isReverseSwap: data.isReverseSwap,
        priceImpact: data.isJustPrice ? null : this.getPriceImpact(bestTrade),
        uid: data.uid,
      });
    }

    return {
      path,
      pathSymbol,
      inputAmount: inputAmount.raw.toString(),
      outputAmount: outputAmount.raw.toString(),
    };
  }

  private async getTrade(data: {
    token1Name: string;
    token2Name: string;
    amount: BigNumber;
    platform?: PLATFORMS;
    isReverseSwap?: boolean;
    blockchainId: number;
    isJustPrice?: boolean;
  }): Promise<Trade | null> {
    const {
      token1Name,
      token2Name,
      amount,
      platform,
      isReverseSwap = false,
      blockchainId,
      isJustPrice = false,
    } = data;

    const token1 = await this.tokenService.getTokenBySymbol(
      token1Name,
      blockchainId,
    );
    const token2 = await this.tokenService.getTokenBySymbol(
      token2Name,
      blockchainId,
    );

    const amountStr = safeBN(amount);

    const swapName = SWAP_MAPPER[platform];

    if (!swapName) {
      if (isReverseSwap) {
        const currencyIn = token1;
        const currencyAmountOut = new TokenAmount(token2, amountStr);

        const bestTradesExactOut = await Promise.all([
          this.useTradeExactOut(
            currencyIn,
            currencyAmountOut,
            SWAP_NAME.pancakeswap,
            blockchainId,
            isJustPrice,
          ),
          this.useTradeExactOut(
            currencyIn,
            currencyAmountOut,
            SWAP_NAME.apeswap,
            blockchainId,
            isJustPrice,
          ),
          this.useTradeExactOut(
            currencyIn,
            currencyAmountOut,
            SWAP_NAME.biswap,
            blockchainId,
            isJustPrice,
          ),
        ]);

        return this.getBestTrade(bestTradesExactOut);
      }

      const currencyAmountIn = new TokenAmount(token1, amountStr);
      const currencyOut = token2;

      const bestTradesExactIn = await Promise.all([
        this.useTradeExactIn(
          currencyAmountIn,
          currencyOut,
          SWAP_NAME.pancakeswap,
          blockchainId,
          isJustPrice,
        ),
        this.useTradeExactIn(
          currencyAmountIn,
          currencyOut,
          SWAP_NAME.apeswap,
          blockchainId,
          isJustPrice,
        ),
        this.useTradeExactIn(
          currencyAmountIn,
          currencyOut,
          SWAP_NAME.biswap,
          blockchainId,
          isJustPrice,
        ),
      ]);

      return this.getBestTrade(bestTradesExactIn);
    }

    if (isReverseSwap) {
      const currencyIn = token1;
      const currencyAmountOut = new TokenAmount(token2, amountStr);

      return this.useTradeExactOut(
        currencyIn,
        currencyAmountOut,
        swapName,
        blockchainId,
        isJustPrice,
      );
    }

    const currencyAmountIn = new TokenAmount(token1, amountStr);
    const currencyOut = token2;

    return this.useTradeExactIn(
      currencyAmountIn,
      currencyOut,
      swapName,
      blockchainId,
      isJustPrice,
    );
  }

  // Returns the best trade for the token in to the exact amount of token out
  private async useTradeExactOut(
    currencyIn: Currency,
    currencyAmountOut: CurrencyAmount,
    swapName: SWAP_NAME,
    blockchainId: number,
    isJustPrice: boolean,
  ): Promise<Trade | null> {
    const allowedPairs = await this.pairsService.useAllCommonPairs(
      currencyIn,
      currencyAmountOut.currency,
      swapName,
      blockchainId,
      isJustPrice,
    );

    if (currencyIn && currencyAmountOut && allowedPairs.length > 0) {
      const tradeList = Trade.bestTradeExactOut(
        allowedPairs,
        currencyIn,
        currencyAmountOut,
        { maxHops: MAX_HOPS, maxNumResults: MAX_NUM_RESULTS },
      ).filter(Boolean);

      return this.getBestTrade(tradeList);
    }

    return null;
  }

  // Returns the best trade for the exact amount of tokens in to the given token out
  private async useTradeExactIn(
    currencyAmountIn: CurrencyAmount,
    currencyOut: Currency,
    swapName: SWAP_NAME,
    blockchainId: number,
    isJustPrice: boolean,
  ): Promise<Trade | null> {
    const allowedPairs = await this.pairsService.useAllCommonPairs(
      currencyAmountIn?.currency,
      currencyOut,
      swapName,
      blockchainId,
      isJustPrice,
    );

    if (currencyAmountIn && currencyOut && allowedPairs.length > 0) {
      const tradeList = Trade.bestTradeExactIn(
        allowedPairs,
        currencyAmountIn,
        currencyOut,
        { maxHops: MAX_HOPS, maxNumResults: MAX_NUM_RESULTS },
      ).filter(Boolean);

      return this.getBestTrade(tradeList);
    }

    return null;
  }

  private getBestTrade(tradeList: Trade[]) {
    let bestTradeSoFar: Trade | null = null;

    for (const trade of tradeList) {
      if (
        isTradeBetter(bestTradeSoFar, trade, BETTER_TRADE_LESS_HOPS_THRESHOLD)
      ) {
        bestTradeSoFar = trade;
      }
    }

    return bestTradeSoFar;
  }

  private getPriceImpact(bestTrade: Trade) {
    const { priceImpactWithoutFee } =
      this.computeTradePriceBreakdown(bestTrade);

    return priceImpactWithoutFee.lessThan(ONE_BIPS)
      ? SMALL_PRICE_IMPACT
      : `${priceImpactWithoutFee.toFixed(2)}%`;
  }

  // computes price breakdown for the trade
  public computeTradePriceBreakdown(trade?: Trade | null): {
    priceImpactWithoutFee: Percent | undefined;
    realizedLPFee: CurrencyAmount | undefined | null;
  } {
    // for each hop in our trade, take away the x*y=k price impact from 0.3% fees
    // e.g. for 3 tokens/2 hops: 1 - ((1 - .03) * (1-.03))
    const realizedLPFee = !trade
      ? undefined
      : ONE_HUNDRED_PERCENT.subtract(
          // eslint-disable-next-line unicorn/no-array-reduce
          trade.route.pairs.reduce<Fraction>(
            (currentFee: Fraction): Fraction =>
              currentFee.multiply(INPUT_FRACTION_AFTER_FEE),
            ONE_HUNDRED_PERCENT,
          ),
        );

    // remove lp fees from price impact
    const priceImpactWithoutFeeFraction =
      trade && realizedLPFee
        ? trade.priceImpact.subtract(realizedLPFee)
        : undefined;

    // the x*y=k impact
    const priceImpactWithoutFeePercent = priceImpactWithoutFeeFraction
      ? new Percent(
          priceImpactWithoutFeeFraction?.numerator,
          priceImpactWithoutFeeFraction?.denominator,
        )
      : undefined;

    // the amount of the input that accrues to LPs
    const realizedLPFeeAmount =
      realizedLPFee &&
      trade &&
      (trade.inputAmount instanceof TokenAmount
        ? new TokenAmount(
            trade.inputAmount.token,
            realizedLPFee.multiply(trade.inputAmount.raw).quotient,
          )
        : CurrencyAmount.ether(
            realizedLPFee.multiply(trade.inputAmount.raw).quotient,
          ));

    return {
      priceImpactWithoutFee: priceImpactWithoutFeePercent,
      realizedLPFee: realizedLPFeeAmount,
    };
  }
}
