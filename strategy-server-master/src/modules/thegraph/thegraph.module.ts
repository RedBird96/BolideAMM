import { Module } from '@nestjs/common';

import { TheGraphService } from './thegraph.service';

@Module({
  imports: [],
  providers: [TheGraphService],
  exports: [TheGraphService],
})
export class TheGraphModule {}
