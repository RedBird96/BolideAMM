import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ContractsModule } from '../contracts/contracts.module';
import { SwapPathEntity } from './swap-path.entity';
import { SwapPathContractsEntity } from './swap-path-contracts.entity';
import { SwapPathsController } from './swap-paths.controller';
import { SwapPathsService } from './swap-paths.service';
import { SwapPathsSerializerService } from './swap-paths-serializer.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SwapPathEntity, SwapPathContractsEntity]),
    ContractsModule,
  ],
  providers: [SwapPathsService, SwapPathsSerializerService],
  controllers: [SwapPathsController],
  exports: [SwapPathsService, SwapPathsSerializerService],
})
export class SwapPathsModule {}
