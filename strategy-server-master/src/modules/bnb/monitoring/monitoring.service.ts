import { Injectable, Logger } from '@nestjs/common';
import { PLATFORMS } from 'src/common/constants/platforms';
import type { PairDto } from 'src/modules/pairs/dto/PairDto';
import type Web3 from 'web3';

import { TG_MESSAGES } from '../../../common/constants/tg-messages';
import { fromWeiToNum, toBN } from '../../../common/utils/big-number-utils';
import { UtilsService } from '../../../providers/utils.service';
import { PairsService } from '../../pairs/pairs.service';
import { TelegramService } from '../../telegram/telegram.service';
import { BinanceApiService } from '../binance/binance-api.service';
import type { MonitoringPairDto } from '../dto/MonitoringPairDto';
import type { MonitoringTokenDto } from '../dto/MonitoringTokenDto';
import { UniswapEthService } from '../uniswap/uniswap-eth.service';
import type { MonitoringPairEntity } from './monitoring-pair.entity';
import { MonitoringPairRepository } from './monitoring-pair.repository';
import { MonitoringTokenRepository } from './monitoring-token.repository';

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  constructor(
    private readonly monitoringTokenRepository: MonitoringTokenRepository,
    private readonly monitoringPairRepository: MonitoringPairRepository,
    private readonly pairsService: PairsService,
    private readonly uniswapEthService: UniswapEthService,
    private readonly telegramService: TelegramService,
    private readonly binanceApiService: BinanceApiService,
  ) {}

  async loadAndSaveMonitoringTokens(data: {
    platforms: PLATFORMS[];
    web3: Web3;
  }): Promise<void> {
    const { platforms, web3 } = data;

    const uniquePairs = await this.pairsService.getUniquePairs();

    for (const platform of platforms) {
      let entities: Array<Partial<MonitoringTokenDto>> = [];

      entities = await (platform === PLATFORMS.BINANCE
        ? this.getTokensPriceForBinance(uniquePairs)
        : this.getTokensPriceForUniswapMarket({
            platform,
            pairs: uniquePairs,
            web3,
          }));

      await this.monitoringTokenRepository.insert(entities);
    }
  }

  async calculateAndSaveMonitoringPairs(): Promise<void> {
    const uniquePairs = await this.pairsService.getUniquePairs();
    const monitoringPairsArray = await this.monitoringPairRepository.findActual(
      uniquePairs.length,
    );

    const currentMonitoringPairsData: Record<number, MonitoringPairEntity> = {};

    for (const value of monitoringPairsArray) {
      currentMonitoringPairsData[value.pairId] = value;
    }

    const entities: Array<Partial<MonitoringPairDto>> = [];

    for (const pair of uniquePairs) {
      const monitoringToken1 = await this.monitoringTokenRepository.findOne(
        { token: pair.farm.token1 },
        { order: { id: 'DESC' } },
      );
      const monitoringToken2 = await this.monitoringTokenRepository.findOne(
        { token: pair.farm.token2 },
        { order: { id: 'DESC' } },
      );

      if (monitoringToken1 && monitoringToken2) {
        const ratio = toBN(monitoringToken1.price)
          .div(toBN(monitoringToken2.price))
          .toFixed(4);
        const oldRatio = currentMonitoringPairsData?.[pair.id]?.ratio || ratio;

        entities.push({
          pairId: pair.id,
          token1Price: monitoringToken1.price,
          token2Price: monitoringToken2.price,
          ratio,
          oldRatio,
        });
      }
    }

    await this.monitoringPairRepository.insert(entities);
  }

  async checkPriceRation(reactionPercent: number): Promise<void> {
    const uniquePairs = await this.pairsService.getUniquePairs();
    const monitoringPairs = await this.monitoringPairRepository.findActual(
      uniquePairs.length,
    );

    const pairsData: Record<number, PairDto> = {};

    for (const value of uniquePairs) {
      pairsData[value.id] = value;
    }

    for (const monitoringPair of monitoringPairs) {
      const pair = pairsData[monitoringPair.pairId];

      const percentDiff = UtilsService.percentDiff(
        Number(monitoringPair.ratio),
        Number(monitoringPair.oldRatio),
      );

      if (pair && percentDiff > reactionPercent) {
        const token1Price = Number(monitoringPair.token1Price).toFixed(6);
        const token2Price = Number(monitoringPair.token2Price).toFixed(6);

        await this.telegramService.sendMessageToGroup(
          TG_MESSAGES.MONITORING_PAIRS_RATIO_CHANGE({
            pairName: pair.farm.pair,
            percentDiff: Number(percentDiff.toFixed(2)),
            tokensPrice: `${pair.farm.token1} ${token1Price}, ${pair.farm.token2} ${token2Price}`,
          }),
        );
      }
    }
  }

  async removeOldData(createdAtFrom: string): Promise<void> {
    await this.monitoringTokenRepository.removeOldData(createdAtFrom);
    await this.monitoringPairRepository.removeOldData(createdAtFrom);
  }

  async getTokensPriceForUniswapMarket(data: {
    platform: PLATFORMS;
    pairs: PairDto[];
    web3: Web3;
  }): Promise<Array<Partial<MonitoringTokenDto>>> {
    const { platform, pairs, web3 } = data;
    const entities: Array<Partial<MonitoringTokenDto>> = [];

    for (const pair of pairs) {
      try {
        const price1 = fromWeiToNum(
          await this.uniswapEthService.getTokenPriceUSD({
            asset: pair.farm.token1,
            platform,
            web3,
          }),
        );
        const price2 = fromWeiToNum(
          await this.uniswapEthService.getTokenPriceUSD({
            asset: pair.farm.token2,
            platform,
            web3,
          }),
        );

        if (price1 && price2) {
          if (!entities.some((entity) => entity.token === pair.farm.token1)) {
            entities.push({
              market: platform,
              token: pair.farm.token1,
              price: price1.toString(),
            });
          }

          if (!entities.some((entity) => entity.token === pair.farm.token2)) {
            entities.push({
              market: platform,
              token: pair.farm.token2,
              price: price2.toString(),
            });
          }
        }
      } catch (error) {
        this.logger.warn({
          message: 'Error while executing loadAndSaveMonitoringTokens',
          pair,
          platform,
          error,
        });
      }
    }

    return entities;
  }

  async getTokensPriceForBinance(
    pairs: PairDto[],
  ): Promise<Array<Partial<MonitoringTokenDto>>> {
    const entities: Array<Partial<MonitoringTokenDto>> = [];

    const symbols: string[] = [];

    for (const pair of pairs) {
      const busdPairName1 = `${pair.farm.token1}BUSD`;
      const busdPairName2 = `${pair.farm.token2}BUSD`;

      if (pair.farm.token1 !== 'BUSD' && !symbols.includes(busdPairName1)) {
        symbols.push(busdPairName1);
      }

      if (pair.farm.token2 !== 'BUSD' && !symbols.includes(busdPairName2)) {
        symbols.push(busdPairName2);
      }
    }

    const priceData: Record<string, string> = {};
    const binancePriceResponse = await this.binanceApiService.getTickerPrice();

    for (const value of binancePriceResponse) {
      priceData[value.symbol] = value.price;
    }

    for (const symbol of symbols) {
      if (priceData[symbol]) {
        entities.push({
          market: PLATFORMS.BINANCE,
          token: symbol.slice(0, Math.max(0, symbol.length - 4)),
          price: toBN(priceData[symbol]).toString(),
        });
      }
    }

    return entities;
  }
}
