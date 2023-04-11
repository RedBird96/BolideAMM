import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ContractEntity } from './contract.entity';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { ContractsSerializerService } from './contracts-serializer.service';

@Module({
  imports: [TypeOrmModule.forFeature([ContractEntity])],
  controllers: [ContractsController],
  providers: [ContractsService, ContractsSerializerService],
  exports: [ContractsService, ContractsSerializerService],
})
export class ContractsModule {}
