import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { ERROR_CODES } from 'src/common/constants/error-codes';
import { LogicException } from 'src/common/logic.exception';
import { fromWei, toBN } from 'src/common/utils/big-number-utils';
import type { BigNumber } from 'src/common/utils/BigNumber';
import { BnbWeb3Service, WEB3_CONTEXT } from 'src/modules/bnb/bnb-web3.service';
import { StakedAmountService } from 'src/modules/bnb/farm/staked-amount.service';
import { SwapEarnService } from 'src/modules/bnb/farm/swap-earn.service';
import { UniswapTokenPriceService } from 'src/modules/bnb/uniswap/uniswap-token-price.service';
import { VenusBorrowService } from 'src/modules/bnb/venus/venus-borrow.service';
import { VenusEarnedService } from 'src/modules/bnb/venus/venus-earned.service';
import { VenusLendedService } from 'src/modules/bnb/venus/venus-lended.service';
import { VenusBorrowPercentService } from 'src/modules/bnb/venus/venus-percent-limit.service';
import { ContractsService } from 'src/modules/contracts/contracts.service';
import type { ContractDto } from 'src/modules/contracts/dto/ContractDto';
import { StrategiesService } from 'src/modules/strategies/strategies.service';
import type Web3 from 'web3';

import type { LandBorrowFarmSettingsDto } from '../dto/LandBorrowFarmSettingsDto';
import { LbfService } from '../lbf.service';
import type { LbfStatDto } from './dto/LbfStatDto';
import type { LbfStatEntity } from './lbf-stat.entity';
import type { SaveLbfStat } from './lbf-stats.repository';
import { LbfStatsRepository } from './lbf-stats.repository';

export interface StakedPortfolio {
  pairs: Record<string, any>;
  total: Record<string, string>;
}

@Injectable()
export class LbfAnalyticsService {
  private readonly logger = new Logger(LbfAnalyticsService.name);

  constructor(
    private readonly lbfStatsRepository: LbfStatsRepository,
    @Inject(forwardRef(() => LbfService))
    private readonly lbfService: LbfService,
    @Inject(forwardRef(() => StrategiesService))
    private readonly strategiesService: StrategiesService,
    private readonly contractsService: ContractsService,
    private readonly bnbWeb3Service: BnbWeb3Service,
    private readonly uniswapTokenPriceService: UniswapTokenPriceService,
    private readonly venusBorrowService: VenusBorrowService,
    private readonly stakedAmountService: StakedAmountService,
    private readonly venusEarnedService: VenusEarnedService,
    private readonly venusLendedService: VenusLendedService,
    private readonly venusBorrowPercentService: VenusBorrowPercentService,
    private readonly swapEarnService: SwapEarnService,
  ) {}

  calcStakedPortfolio(data: {
    staked: Record<string, BigNumber>;
    tokensPriceBusdResults: Record<
      string,
      {
        rate: BigNumber;
        rateWei: BigNumber;
      }
    >;
  }): StakedPortfolio {
    const { staked, tokensPriceBusdResults } = data;

    const pairsGroupedByPlatform = {};
    const totalAmount = {};

    for (const key in staked) {
      const value = staked[key];

      const keyArray = key.split('_');
      const platformAndToken = keyArray[1];
      const pair = keyArray[0];

      const platformAndTokenArray = platformAndToken.split('#');
      const platform = platformAndTokenArray[0];
      const token = platformAndTokenArray[1];

      if (!pairsGroupedByPlatform[platform]) {
        pairsGroupedByPlatform[platform] = {};
      }

      if (!pairsGroupedByPlatform[platform][pair]) {
        pairsGroupedByPlatform[platform][pair] = {};
      }

      let rate = toBN('1');
      let amountBUSD = toBN('0');

      if (
        tokensPriceBusdResults[token] &&
        tokensPriceBusdResults[token].rateWei
      ) {
        rate = tokensPriceBusdResults[token].rateWei;

        amountBUSD = rate.mul(value);
      }

      pairsGroupedByPlatform[platform][pair][token] = {
        amount: value.toFixed(6),
        amountBUSD: amountBUSD.toFixed(6),
      };

      if (!totalAmount[platform]) {
        totalAmount[platform] = amountBUSD;
      } else {
        totalAmount[platform] = totalAmount[platform].add(amountBUSD);
      }
    }

    const total = {};

    for (const key in totalAmount) {
      total[key] = totalAmount[key].toFixed(6);
    }

    return {
      pairs: pairsGroupedByPlatform,
      total,
    };
  }

  async calcBorrowVsPairDiffUSD(data: {
    storageContract: ContractDto;
    logicContract: ContractDto;
    web3: Web3;
  }): Promise<{
    amount: BigNumber;
    borrowed: Record<string, BigNumber>;
    borrowedAmount: BigNumber;
    staked: Record<string, BigNumber>;
    stakedAmount: BigNumber;
    wallet: Record<string, BigNumber>;
    walletAmount: BigNumber;
    borrowVsStaked: Record<string, BigNumber>;
    borrowedInTokens: Record<string, BigNumber>;
    stakedPortfolio: StakedPortfolio;
  }> {
    const { logicContract, storageContract, web3 } = data;

    const tokensDiff = await this.venusBorrowService.getBorrowVsPairDiff({
      logicContract,
      storageContract,
      web3,
    });

    let totalAmount = toBN('0');
    const borrowVsStaked = {};

    const tokensPriceBusdResults =
      await this.uniswapTokenPriceService.getTokensRateWeiAndAmountBusd({
        items: tokensDiff.result,
        web3,
      });

    for (const key in tokensPriceBusdResults) {
      if (tokensPriceBusdResults[key]) {
        const amount = tokensPriceBusdResults[key].amountBUSD;
        borrowVsStaked[key] = amount;
        totalAmount = totalAmount.add(amount);
      } else {
        this.logger.error({
          message: 'tokensPriceBusdResults[key] undefined',
          key,
        });

        throw new LogicException(ERROR_CODES.INVALID_DATA_FOR_CALC);
      }
    }

    let borrowedAmount = toBN('0');

    const tokenPriceBorrowedResults =
      await this.uniswapTokenPriceService.getTokensRateWeiAndAmountBusd({
        items: tokensDiff.borrowed,
        web3,
      });

    const borrowedInTokens = {};

    for (const key in tokensDiff.borrowed) {
      const item = tokensDiff.borrowed[key];

      borrowedInTokens[key] = item.mul(toBN(-1)).toString(10);
    }

    const stakedPortfolio = this.calcStakedPortfolio({
      staked: tokensDiff.staked,
      tokensPriceBusdResults,
    });

    for (const key in tokenPriceBorrowedResults) {
      if (tokenPriceBorrowedResults[key]) {
        const amount = tokenPriceBorrowedResults[key].amountBUSD;

        tokensDiff.borrowed[key] = amount;
        borrowedAmount = borrowedAmount.add(amount);
      } else {
        this.logger.error({
          message: 'tokenPriceBorrowedResults[key] undefined',
          key,
        });

        throw new LogicException(ERROR_CODES.INVALID_DATA_FOR_CALC);
      }
    }

    let walletAmount = toBN('0');

    const tokenPriceWalletResults =
      await this.uniswapTokenPriceService.getTokensRateWeiAndAmountBusd({
        items: tokensDiff.wallet,
        web3,
      });

    for (const key in tokenPriceWalletResults) {
      if (tokenPriceWalletResults[key]) {
        const amount = tokenPriceWalletResults[key].amountBUSD;

        tokensDiff.wallet[key] = amount;
        walletAmount = walletAmount.add(amount);
      } else {
        this.logger.error({
          message: 'tokenPriceWalletResults[key] undefined',
          key,
        });

        throw new LogicException(ERROR_CODES.INVALID_DATA_FOR_CALC);
      }
    }

    const { stakedAmount, staked } =
      await this.uniswapTokenPriceService.getStakedAmoundAndStakedPriceBusd({
        stakedItems: tokensDiff.staked,
        web3,
      });

    return {
      amount: totalAmount,
      borrowed: tokensDiff.borrowed,
      borrowedAmount,
      staked,
      stakedAmount,
      wallet: tokensDiff.wallet,
      walletAmount,
      borrowVsStaked,
      borrowedInTokens,
      stakedPortfolio,
    };
  }

  async calcAnalytics(data: {
    strategyId: number;
    web3: Web3;
  }): Promise<SaveLbfStat> {
    const { strategyId, web3 } = data;

    const strategy = await this.strategiesService.getStrategyById(strategyId);

    const { storageContract, logicContract, operationsPrivateKeyId } = strategy;

    const { web3: operationsWeb3 } =
      await this.bnbWeb3Service.createWeb3AndAccount(
        operationsPrivateKeyId,
        WEB3_CONTEXT.OPERATIONS,
      );

    let totalAmount = toBN('0');

    const venusEarned = await this.venusEarnedService.getVenusEarned({
      walletAddress: logicContract.address,
      web3,
    });

    const [amtVenus, amtPairs, farms, mapFarmPlatformsTokens] =
      await Promise.all([
        this.uniswapTokenPriceService.getTokensRateWeiAndAmountBusd({
          items: {
            XVS: toBN(venusEarned.toString()),
          },
          web3,
        }),

        this.calcBorrowVsPairDiffUSD({
          storageContract,
          logicContract,
          web3,
        }),

        this.stakedAmountService.getFarmsStakedAmount({
          logicContract,
          web3,
        }),

        this.contractsService.getFarmPlatformsTokens(
          storageContract.blockchainId,
        ),
      ]);

    totalAmount = totalAmount.add(amtPairs.amount);

    let farmingAmount = toBN(0);

    const swapEarns = await this.swapEarnService.calcSwapEarns({
      farms,
      storageContract,
      logicContract,
      web3,
    });

    const earnTokensAndAmount = {};

    for (const key in swapEarns) {
      const platform = swapEarns[key].platform;

      const farmToken = mapFarmPlatformsTokens.get(platform);

      earnTokensAndAmount[farmToken.name] = earnTokensAndAmount[farmToken.name]
        ? earnTokensAndAmount[farmToken.name].add(swapEarns[key].amount)
        : swapEarns[key].amount;
    }

    const earnsTokensPriceBusdResults =
      await this.uniswapTokenPriceService.getTokensRateWeiAndAmountBusd({
        items: earnTokensAndAmount,
        web3,
      });

    for (const key in earnsTokensPriceBusdResults) {
      if (earnsTokensPriceBusdResults[key]) {
        const amount = earnsTokensPriceBusdResults[key].amountBUSD;

        totalAmount = totalAmount.add(amount);
        farmingAmount = farmingAmount.add(amount);
      } else {
        this.logger.error({
          message: 'earnsTokensPriceBusdResults[key] undefined',
          key,
        });

        throw new LogicException(ERROR_CODES.INVALID_DATA_FOR_CALC);
      }
    }

    const farmingEarns = {};

    for (const key in swapEarns) {
      const platform = swapEarns[key].platform;
      const amount = swapEarns[key].amount;
      const farmToken = mapFarmPlatformsTokens.get(platform);

      if (amount.gt(0)) {
        const rateWei = earnsTokensPriceBusdResults[farmToken.name].rateWei;

        farmingEarns[key] = amount.mul(rateWei).toFixed(6);
      }
    }

    const lendedTokensWei = await this.venusLendedService.getLendedTokens({
      storageContract,
      logicContract,
      web3: operationsWeb3,
    });

    const lendedTokensPriceItems = {};
    const venusTokensBalanceItems = {};

    for (const key in lendedTokensWei) {
      lendedTokensPriceItems[key] = fromWei(lendedTokensWei[key].diff);
      venusTokensBalanceItems[key] = fromWei(
        lendedTokensWei[key].vTokenBalance,
      );
    }

    const lendedTokensPriceBusdResults =
      await this.uniswapTokenPriceService.getTokensRateWeiAndAmountBusd({
        items: lendedTokensPriceItems,
        web3,
      });

    const venusTokensBalanceBusdResults =
      await this.uniswapTokenPriceService.getTokensRateWeiAndAmountBusd({
        items: venusTokensBalanceItems,
        web3,
      });

    let lendedTokensAmount = toBN(0);

    for (const key in lendedTokensPriceBusdResults) {
      if (lendedTokensPriceBusdResults[key]) {
        lendedTokensAmount = lendedTokensAmount.add(
          lendedTokensPriceBusdResults[key].amountBUSD,
        );
      } else {
        this.logger.error({
          message: 'lendedTokensPriceBusdResults[key] undefined',
          key,
        });

        throw new LogicException(ERROR_CODES.INVALID_DATA_FOR_CALC);
      }
    }

    totalAmount = totalAmount
      .add(lendedTokensAmount)
      .add(amtVenus.XVS.amountBUSD);

    const percentsData =
      await this.venusBorrowPercentService.getStrategyPercents({
        borrowedAmount: amtPairs.borrowedAmount,
        venusTokensBalanceBusd: venusTokensBalanceBusdResults,
        web3,
      });

    const settings = strategy.settings as LandBorrowFarmSettingsDto;

    if (settings.isBnbBorrowLimitCronEnabled) {
      await this.lbfService.checkBorrowLimitAndSendTgNoti({
        currentPercent: percentsData.currentPercent,
        strategyId,
      });
    }

    const walletInfo = {};
    const staked = {};
    const borrowed = {};

    for (const key in amtPairs.wallet) {
      if (!amtPairs.wallet[key].eq(0)) {
        walletInfo[key] = amtPairs.wallet[key].toFixed(6);
      }
    }

    for (const key in amtPairs.staked) {
      if (!amtPairs.staked[key].eq(0)) {
        staked[key] = amtPairs.staked[key].toFixed(6);
      }
    }

    for (const key in amtPairs.borrowed) {
      if (!amtPairs.borrowed[key].eq(0)) {
        borrowed[key] = amtPairs.borrowed[key].toFixed(6);
      }
    }

    const borrowVsStaked = {};

    for (const key in amtPairs.borrowVsStaked) {
      if (!amtPairs.borrowVsStaked[key].eq(0)) {
        borrowVsStaked[key] = amtPairs.borrowVsStaked[key].toFixed(6);
      }
    }

    const lendedTokens = {};

    for (const key in lendedTokensWei) {
      let diff = '';
      let vTokenBalance = '';

      if (lendedTokensWei[key].diff) {
        diff = fromWei(lendedTokensWei[key].diff).toFixed(6);
      }

      if (lendedTokensWei[key].vTokenBalance) {
        vTokenBalance = fromWei(lendedTokensWei[key].vTokenBalance).toFixed(6);
      }

      lendedTokens[key] = {
        diff,
        vTokenBalance,
      };
    }

    let lendedTotal = toBN('0');

    for (const key in venusTokensBalanceBusdResults) {
      const item = venusTokensBalanceBusdResults[key];

      if (!item) {
        this.logger.error({
          message: 'venusTokensBalanceBusdResults[key] undefined',
          key,
        });

        throw new LogicException(ERROR_CODES.INVALID_DATA_FOR_CALC);
      }

      lendedTokens[key] = {
        ...lendedTokens[key],
        vTokenBalanceBusd: item.amountBUSD.toFixed(6),
      };

      lendedTotal = lendedTotal.add(item.amountBUSD);
    }

    const statItem: SaveLbfStat = {
      strategyId,
      amount: totalAmount.toFixed(6),
      venusEarnAmount: amtVenus.XVS.amountBUSD.toFixed(6),
      farmingAmount: farmingAmount.toFixed(6),
      lendedAmount: lendedTokensAmount.toFixed(6),
      borrowVsStakedAmount: amtPairs.amount.toFixed(6),
      borrowedAmount: amtPairs.borrowedAmount.toFixed(6),
      stakedAmount: amtPairs.stakedAmount.toFixed(6),
      venusPercentLimit: percentsData.currentPercent.toFixed(6),
      walletAmount: amtPairs.walletAmount.toFixed(6),

      borrowVsStaked,
      walletInfo,
      staked,
      stakedPortfolio: amtPairs.stakedPortfolio,
      borrowed,
      lendedTokens,
      lendedTotal: lendedTotal.toFixed(6),
      farmingEarns,
    };

    return statItem;
  }

  async calcAnalyticsAndSaveResult(data: {
    strategyId: number;
    web3: Web3;
  }): Promise<LbfStatEntity> {
    const { strategyId, web3 } = data;

    const statItem = await this.calcAnalytics({ strategyId, web3 });

    try {
      return await this.lbfStatsRepository.saveLbfStat(statItem);
    } catch (error) {
      this.logger.error({
        error,
        statItem,
        message: `strategy ${strategyId} analytics`,
      });

      return null;
    }
  }

  async getLastAnalyticData(strategyId: number): Promise<LbfStatDto> {
    const last = await this.lbfStatsRepository.findOne({
      where: {
        strategyId,
      },
      order: {
        id: 'DESC',
      },
    });

    return last ? last.toDto() : null;
  }
}
