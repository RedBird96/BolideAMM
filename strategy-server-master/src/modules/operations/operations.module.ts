import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BnbModule } from '../bnb/bnb.module';
import { PairsModule } from '../pairs/pairs.module';
import { StrategiesModule } from '../strategies/strategies.module';
import { OperationsController } from './operations.controller';
import { OperationsRepository } from './operations.repository';
import { OperationsService } from './operations.service';

@Module({
  imports: [
    forwardRef(() => BnbModule),
    forwardRef(() => StrategiesModule),
    forwardRef(() => PairsModule),
    TypeOrmModule.forFeature([OperationsRepository]),
  ],
  controllers: [OperationsController],
  providers: [OperationsService],
  exports: [OperationsService],
})
export class OperationsModule {}
