import { CacheModule, forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BlockchainsModule } from '../blockchains/blockchains.module';
import { ContractsModule } from '../contracts/contracts.module';
import { PairsModule } from '../pairs/pairs.module';
import { QueuesModule } from '../queues/queues.module';
import { StrategiesModule } from '../strategies/strategies.module';
import { SwapPathsModule } from '../swap-paths/swap-paths.module';
import { TelegramModule } from '../telegram/telegram.module';
import { TheGraphModule } from '../thegraph/thegraph.module';
import { ApyStatsRepository } from './analytics/apy-stats.repository';
import { BnbAnalyticsController } from './analytics/bnb-analytics.controller';
import { BnbAnalyticsService } from './analytics/bnb-analytics.service';
import { BnbAnalyticsWorkers } from './analytics/bnb-analytics.workers';
import { FarmStatsRepository } from './analytics/farm-stats.repository';
import { LendingStatsRepository } from './analytics/lending-stats.repository';
import { ApeSwapEthService } from './apeswap/apeswap-eth.serivce';
import { ApyService } from './apy/apy.service';
import { ApyCronWorkers } from './apy/apy-cron.workers';
import { ApyHistoryRepository } from './apy/apy-history.repository';
import { BalanceService } from './balance.service';
import { BinanceApiService } from './binance/binance-api.service';
import { BiswapEthService } from './biswap/biswap-eth.service';
import { BnbController } from './bnb.controller';
import { BnbQueuesService } from './bnb-queues.service';
import { BnbUtilsService } from './bnb-utils.service';
import { BnbWeb3Service } from './bnb-web3.service';
import { FarmAnalyticService } from './farm/farm-analytics.service';
import { FarmEthService } from './farm/farm-eth.service';
import { StakedAmountService } from './farm/staked-amount.service';
import { SwapEarnService } from './farm/swap-earn.service';
import { MonitoringService } from './monitoring/monitoring.service';
import { MonitoringCronWorkers } from './monitoring/monitoring-cron.workers';
import { MonitoringPairRepository } from './monitoring/monitoring-pair.repository';
import { MonitoringTokenRepository } from './monitoring/monitoring-token.repository';
import { MulticallSendService } from './multicall/multicall-send.service';
import { MulticallViewService } from './multicall/multicall-view.service';
import { PancakeEthService } from './pancake/pancake-eth.service';
import { TokenEthService } from './token/token-eth.service';
import { TransactionsRepository } from './transactions.repository';
import { TransactionsService } from './transactions.service';
import { TvlService } from './tvl/tvl.service';
import { TvlCronWorkers } from './tvl/tvl-cron.workers';
import { TvlHistoryRepository } from './tvl/tvl-history.repository';
import { TvlHistoryService } from './tvl/tvl-history.service';
import { DexAggregatorService } from './uniswap/dex-aggregator.service';
import { PairsService } from './uniswap/trade-service/pairs.service';
import { TokenService } from './uniswap/trade-service/token.service';
import { TradeService } from './uniswap/trade-service/trade.service';
import { UniswapApiService } from './uniswap/uniswap-api.serivce';
import { UniswapEthService } from './uniswap/uniswap-eth.service';
import { UniswapTokenPriceService } from './uniswap/uniswap-token-price.service';
import { VenusController } from './venus/venus.controller';
import { VenusBalanceService } from './venus/venus-balance.service';
import { VenusBorrowService } from './venus/venus-borrow.service';
import { VenusComputeApyService } from './venus/venus-compute-apy.service';
import { VenusEarnedService } from './venus/venus-earned.service';
import { VenusEthService } from './venus/venus-eth.service';
import { VenusLendedService } from './venus/venus-lended.service';
import { VenusBorrowPercentService } from './venus/venus-percent-limit.service';
import { VenusTokensInfoService } from './venus/venus-tokens-info.service';

@Module({
  imports: [
    PairsModule,
    TypeOrmModule.forFeature([
      TransactionsRepository,
      FarmStatsRepository,
      LendingStatsRepository,
      ApyStatsRepository,
      MonitoringTokenRepository,
      MonitoringPairRepository,
      TvlHistoryRepository,
      ApyHistoryRepository,
    ]),
    CacheModule.register(),
    TelegramModule,
    TheGraphModule,
    forwardRef(() => StrategiesModule),
    forwardRef(() => BlockchainsModule),
    ContractsModule,
    SwapPathsModule,
    QueuesModule,
  ],
  controllers: [BnbAnalyticsController, BnbController, VenusController],
  providers: [
    BnbWeb3Service,
    BnbUtilsService,
    BnbAnalyticsService,
    TransactionsService,
    TokenEthService,
    UniswapApiService,
    UniswapEthService,
    FarmEthService,
    VenusEthService,
    DexAggregatorService,
    ApeSwapEthService,
    PancakeEthService,
    BiswapEthService,
    BinanceApiService,
    FarmAnalyticService,
    MonitoringService,
    MonitoringCronWorkers,
    TvlService,
    TvlHistoryService,
    TvlCronWorkers,
    ApyService,
    ApyCronWorkers,
    BalanceService,
    BnbAnalyticsWorkers,
    BnbQueuesService,
    TradeService,
    PairsService,
    MulticallViewService,
    MulticallSendService,
    TokenService,
    UniswapTokenPriceService,
    VenusBorrowService,
    StakedAmountService,
    VenusEarnedService,
    VenusBalanceService,
    VenusLendedService,
    VenusBorrowPercentService,
    VenusComputeApyService,
    VenusTokensInfoService,
    SwapEarnService,
  ],
  exports: [
    BnbWeb3Service,
    BnbUtilsService,
    TransactionsService,
    TokenEthService,
    UniswapApiService,
    UniswapEthService,
    FarmEthService,
    VenusEthService,
    DexAggregatorService,
    ApeSwapEthService,
    PancakeEthService,
    BinanceApiService,
    FarmAnalyticService,
    MonitoringService,
    MulticallViewService,
    MulticallSendService,
    TvlService,
    TvlHistoryService,
    TvlCronWorkers,
    ApyService,
    ApyCronWorkers,
    BalanceService,
    BiswapEthService,
    BnbAnalyticsWorkers,
    UniswapTokenPriceService,
    VenusBorrowService,
    StakedAmountService,
    VenusEarnedService,
    VenusBalanceService,
    VenusLendedService,
    VenusBorrowPercentService,
    VenusComputeApyService,
    VenusTokensInfoService,
    SwapEarnService,
    TradeService,
  ],
})
export class BnbModule {}
