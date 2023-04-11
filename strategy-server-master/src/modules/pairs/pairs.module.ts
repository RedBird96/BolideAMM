import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BnbModule } from '../bnb/bnb.module';
import { ContractEntity } from '../contracts/contract.entity';
import { ContractsModule } from '../contracts/contracts.module';
import { StrategiesModule } from '../strategies/strategies.module';
import { PairController } from './pair.controller';
import { PairsService } from './pairs.service';

@Module({
  imports: [
    forwardRef(() => BnbModule),
    forwardRef(() => StrategiesModule),
    TypeOrmModule.forFeature([ContractEntity]),
    ContractsModule,
  ],
  controllers: [PairController],
  providers: [PairsService],
  exports: [PairsService],
})
export class PairsModule {}
