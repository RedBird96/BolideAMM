import { Module } from '@nestjs/common';

import { BnbModule } from '../bnb/bnb.module';
import { ContractsModule } from '../contracts/contracts.module';
import { StrategiesModule } from '../strategies/strategies.module';
import { ExternalController } from './external.controller';

@Module({
  imports: [ContractsModule, BnbModule, StrategiesModule],
  controllers: [ExternalController],
  providers: [],
  exports: [],
})
export class ExternalApiModule {}
