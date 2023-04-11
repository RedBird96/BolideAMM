import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { StrategiesRepository } from '../strategies/strategies.repository';
import { StrategyPairRepository } from '../strategies/strategy-pair/strategy-pair.repository';
import { RuntimeKeyEntity } from './runtime-key.entity';
import { RuntimeKeysController } from './runtime-keys.controller';
import { RuntimeKeysService } from './runtime-keys.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      RuntimeKeyEntity,
      StrategiesRepository,
      StrategyPairRepository,
    ]),
  ],
  controllers: [RuntimeKeysController],
  providers: [RuntimeKeysService],
  exports: [RuntimeKeysService],
})
export class RuntimeKeysModule {}
