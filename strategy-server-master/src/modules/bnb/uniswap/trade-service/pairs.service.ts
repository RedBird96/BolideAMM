import type { Currency, SWAP_NAME } from '@bolide/swap-sdk';
import { Pair, Token, TokenAmount } from '@bolide/swap-sdk';
import { Interface } from '@ethersproject/abi';
import { Injectable, Logger } from '@nestjs/common';
import type { BigNumber } from 'ethers';
import flatMap from 'lodash/flatMap';

import { MulticallViewService } from '../../multicall/multicall-view.service';
import IPancakePairABI from './abi/IPancakePair.json';
import { TokenService } from './token.service';
import { BSC_CHAIN_ID, ChainId } from './utils/utils';

const PAIR_INTERFACE = new Interface(IPancakePairABI);

export enum PairState {
  LOADING,
  NOT_EXISTS,
  EXISTS,
  INVALID,
}
@Injectable()
export class PairsService {
  private readonly logger = new Logger(PairsService.name);

  constructor(
    private readonly multicallViewService: MulticallViewService,
    private readonly tokenService: TokenService,
  ) {}

  async useAllCommonPairs(
    currencyA: Currency,
    currencyB: Currency,
    swapName: SWAP_NAME,
    blockchainId: number,
    isJustPrice: boolean,
  ): Promise<Pair[]> {
    const tokenA = await this.wrappedCurrency(
      currencyA,
      BSC_CHAIN_ID,
      blockchainId,
    );
    const tokenB = await this.wrappedCurrency(
      currencyB,
      BSC_CHAIN_ID,
      blockchainId,
    );

    const bases: Token[] = await this.getBases({
      tokenA,
      tokenB,
      blockchainId,
      isLightMode: isJustPrice,
    });

    const basePairs: Array<[Token, Token]> = flatMap(
      bases,
      (base): Array<[Token, Token]> =>
        bases.map((otherBase) => [base, otherBase]),
    );

    const allPairCombinations = this.getAllPairCombinations(
      tokenA,
      tokenB,
      bases,
      basePairs,
    );

    const allPairs = await this.getPairs(
      allPairCombinations,
      swapName,
      blockchainId,
    );

    // only pass along valid pairs, non-duplicated pairs
    return Object.values(
      allPairs
        // filter out invalid pairs
        .filter((result): result is [PairState.EXISTS, Pair] =>
          Boolean(result[0] === PairState.EXISTS && result[1]),
        )
        // filter out duplicated pairs
        // eslint-disable-next-line unicorn/no-array-reduce
        .reduce<Record<string, Pair>>((memo, [, curr]) => {
          memo[curr.liquidityToken.address] =
            memo[curr.liquidityToken.address] ?? curr;

          return memo;
        }, {}),
    );
  }

  public async getBases(data: {
    tokenA: Token;
    tokenB: Token;
    blockchainId: number;
    isLightMode: boolean;
  }) {
    const { tokenA, tokenB, blockchainId, isLightMode } = data;

    /**
     * Addittional bases for specific tokens
     * @example { [WBTC.address]: [renBTC], [renBTC.address]: [WBTC] }
     */
    const ADDITIONAL_BASES: {
      [chainId in ChainId]?: Record<string, Token[]>;
    } = {
      [ChainId.MAINNET]: {},
    };

    const LIQUIDITY_SYMBOLS = isLightMode
      ? ['BUSD', 'USDT', 'BNB']
      : ['BUSD', 'USDT', 'USDC', 'BTC', 'BNB', 'ETH'];

    const LIQUIDITY_TOKENS = await Promise.all(
      LIQUIDITY_SYMBOLS.map((symbol) =>
        this.tokenService.getTokenBySymbol(symbol, blockchainId),
      ),
    );

    const BASES_TO_CHECK_TRADES_AGAINST = {
      [ChainId.MAINNET]: LIQUIDITY_TOKENS,
    };

    const common = BASES_TO_CHECK_TRADES_AGAINST[BSC_CHAIN_ID] ?? [];

    const additionalA = tokenA
      ? ADDITIONAL_BASES[BSC_CHAIN_ID]?.[tokenA.address] ?? []
      : [];

    const additionalB = tokenB
      ? ADDITIONAL_BASES[BSC_CHAIN_ID]?.[tokenB.address] ?? []
      : [];

    return [...common, ...additionalA, ...additionalB];
  }

  public getAllPairCombinations(
    tokenA: Token,
    tokenB: Token,
    bases: Token[],
    basePairs: Array<[Token, Token]>,
  ): Array<[Token, Token]> {
    /**
     * Some tokens can only be swapped via certain pairs, so we override the list of bases that are considered for these
     * tokens.
     * @example [AMPL.address]: [DAI, WETH[ChainId.MAINNET]]
     */
    const CUSTOM_BASES: {
      [chainId in ChainId]?: Record<string, Token[]>;
    } = {
      [ChainId.MAINNET]: {},
    };

    return tokenA && tokenB
      ? [
          [tokenA, tokenB], // the direct pair
          ...bases.map((base): [Token, Token] => [tokenA, base]), // token A against all bases
          ...bases.map((base): [Token, Token] => [tokenB, base]), // token B against all bases
          ...basePairs, // each base against all bases
        ]
          .filter((tokens): tokens is [Token, Token] =>
            Boolean(tokens[0] && tokens[1]),
          )
          .filter(([t0, t1]) => t0.address !== t1.address)
          .filter(([localTokenA, localTokenB]) => {
            const customBases = CUSTOM_BASES[BSC_CHAIN_ID];

            const customBasesA: Token[] | undefined =
              customBases?.[localTokenA.address];

            const customBasesB: Token[] | undefined =
              customBases?.[localTokenB.address];

            if (!customBasesA && !customBasesB) {
              return true;
            }

            if (
              customBasesA &&
              !customBasesA.some((base) => localTokenB.equals(base))
            ) {
              return false;
            }

            return !(
              customBasesB &&
              !customBasesB.some((base) => localTokenA.equals(base))
            );
          })
      : [];
  }

  public async getPairs(
    currencies: Array<[Currency | undefined, Currency | undefined]>,
    swapName: SWAP_NAME,
    blockchainId: number,
  ): Promise<Array<[PairState, Pair | null]>> {
    const tokens: Token[][] = await Promise.all(
      currencies.map(async ([currencyA, currencyB]) => [
        await this.wrappedCurrency(currencyA, BSC_CHAIN_ID, blockchainId),
        await this.wrappedCurrency(currencyB, BSC_CHAIN_ID, blockchainId),
      ]),
    );

    const pairAddresses = tokens.map(([tokenA, tokenB]) => {
      try {
        return tokenA && tokenB && !tokenA.equals(tokenB)
          ? Pair.getAddress(tokenA, tokenB, swapName)
          : undefined;
      } catch (error: any) {
        this.logger.warn({
          message: `getPairs > pairAddresses: ${tokenA?.address}-${tokenB?.address} chainId: ${tokenA?.chainId}`,
          error,
        });
      }
    });

    const results: Array<{ reserve0: BigNumber; reserve1: BigNumber }> =
      await this.multicallViewService.useMultipleContractSingleData(
        pairAddresses,
        PAIR_INTERFACE,
        'getReserves',
      );

    return results.map((result, i) => {
      const tokenA = tokens[i][0];
      const tokenB = tokens[i][1];

      if (!tokenA || !tokenB || tokenA.equals(tokenB)) {
        return [PairState.INVALID, null];
      }

      if (!result) {
        return [PairState.NOT_EXISTS, null];
      }

      const { reserve0, reserve1 } = result;

      const [token0, token1] = tokenA.sortsBefore(tokenB)
        ? [tokenA, tokenB]
        : [tokenB, tokenA];

      return [
        PairState.EXISTS,
        new Pair(
          new TokenAmount(token0, reserve0.toString()),
          new TokenAmount(token1, reserve1.toString()),
          swapName,
        ),
      ];
    });
  }

  private async wrappedCurrency(
    currency: Currency | undefined,
    _chainId: ChainId | undefined,
    blockchainId: number,
  ): Promise<Token | undefined> {
    const WETH = {
      [ChainId.MAINNET]: await this.tokenService.getTokenBySymbol(
        'BNB',
        blockchainId,
      ),
    };

    const token = currency instanceof Token ? currency : undefined;

    return _chainId && currency === WETH[_chainId] ? WETH[_chainId] : token;
  }
}
