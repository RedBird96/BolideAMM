import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BnbModule } from '../bnb/bnb.module';
import { ContractsModule } from '../contracts/contracts.module';
import { LbfStrategyModule } from '../land-borrow-farm-strategy/lbf.module';
import { OperationsModule } from '../operations/operations.module';
import { PairsModule } from '../pairs/pairs.module';
import { QueuesModule } from '../queues/queues.module';
import { TelegramModule } from '../telegram/telegram.module';
import { SettingsValidationService } from './settings-validation.service';
import { StrategiesRepository } from './strategies.repository';
import { StrategiesService } from './strategies.service';
import { StrategiesQueuesService } from './strategies-queues.service';
import { StrategiesRunnerService } from './strategies-runner.service';
import { StrategyController } from './strategy.controller';
import { StrategyPairRepository } from './strategy-pair/strategy-pair.repository';

@Module({
  imports: [
    forwardRef(() => BnbModule),
    forwardRef(() => OperationsModule),
    forwardRef(() => PairsModule),
    forwardRef(() => LbfStrategyModule),
    TypeOrmModule.forFeature([StrategiesRepository, StrategyPairRepository]),
    TelegramModule,
    ContractsModule,
    QueuesModule,
  ],
  controllers: [StrategyController],
  providers: [
    StrategiesService,
    StrategiesQueuesService,
    StrategiesRunnerService,
    SettingsValidationService,
  ],
  exports: [
    StrategiesService,
    StrategiesQueuesService,
    StrategiesRunnerService,
    SettingsValidationService,
  ],
})
export class StrategiesModule {}
