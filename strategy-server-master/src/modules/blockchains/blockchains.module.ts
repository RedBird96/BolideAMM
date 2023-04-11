import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BnbModule } from '../bnb/bnb.module';
import { ContractsModule } from '../contracts/contracts.module';
import { OperationsModule } from '../operations/operations.module';
import { SwapPathsModule } from '../swap-paths/swap-paths.module';
import { BlockchainEntity } from './blockchain.entity';
import { BlockchainsController } from './blockchains.controller';
import { BlockchainsService } from './blockchains.service';
import { BlockchainsSettingsService } from './blockchains-settings.service';

@Module({
  imports: [
    forwardRef(() => BnbModule),
    OperationsModule,
    ContractsModule,
    SwapPathsModule,
    TypeOrmModule.forFeature([BlockchainEntity]),
  ],
  controllers: [BlockchainsController],
  exports: [BlockchainsService, BlockchainsSettingsService],
  providers: [BlockchainsService, BlockchainsSettingsService],
})
export class BlockchainsModule {}
