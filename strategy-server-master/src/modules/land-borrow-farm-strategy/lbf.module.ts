import { CacheModule, forwardRef, Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BlockchainsModule } from '../blockchains/blockchains.module';
import { BnbModule } from '../bnb/bnb.module';
import { TransactionsRepository } from '../bnb/transactions.repository';
import { ContractsModule } from '../contracts/contracts.module';
import { OperationsModule } from '../operations/operations.module';
import { QueuesModule } from '../queues/queues.module';
import { StrategiesModule } from '../strategies/strategies.module';
import { TelegramModule } from '../telegram/telegram.module';
import { TheGraphModule } from '../thegraph/thegraph.module';
import { LbfAnalyticsService } from './analytics/lbf-analytics.service';
import { LbfStatsRepository } from './analytics/lbf-stats.repository';
import { BolidLibService } from './bolide-lib.service';
import { BoostingService } from './boosting.service';
import { ClaimService } from './claim.service';
import { ClaimFarmsService } from './claim-farms.service';
import { ClaimVenusService } from './claim-venus.service';
import { LbfService } from './lbf.service';
import { LbfCronWorkers } from './lbf-cron.workers';
import { LbfQueueWorkers } from './lbf-queue.workers';
import { LiquidityInService } from './logic/liquidity-in.service';
import { LiquidityOutService } from './logic/liquidity-out.service';
import { LogicEthService } from './logic/logic-eth.service';
import { PairEthService } from './logic/pair-eth.service';
import { StorageEthService } from './logic/storage-eth.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    CacheModule.register(),
    TypeOrmModule.forFeature([TransactionsRepository, LbfStatsRepository]),
    forwardRef(() => BnbModule),
    TelegramModule,
    forwardRef(() => StrategiesModule),
    forwardRef(() => BlockchainsModule),
    ContractsModule,
    forwardRef(() => OperationsModule),
    TheGraphModule,
    QueuesModule,
  ],
  controllers: [],
  exports: [
    BolidLibService,
    LiquidityOutService,
    LiquidityInService,
    PairEthService,
    LbfService,
    ClaimService,
    LogicEthService,
    StorageEthService,
    LbfQueueWorkers,
    LbfCronWorkers,
    BoostingService,
    LbfAnalyticsService,
    ClaimFarmsService,
    ClaimVenusService,
  ],
  providers: [
    BolidLibService,
    LiquidityOutService,
    LiquidityInService,
    PairEthService,
    LbfService,
    ClaimService,
    LbfQueueWorkers,
    LogicEthService,
    StorageEthService,
    LbfCronWorkers,
    BoostingService,
    LbfAnalyticsService,
    ClaimFarmsService,
    ClaimVenusService,
  ],
})
export class LbfStrategyModule {}
