import { Module } from '@nestjs/common';

import { BlidController } from './blid.controller';
import { BlidEthService } from './blid-eth.service';
import { EthWeb3Service } from './eth-web3.service';

@Module({
  imports: [],
  controllers: [BlidController],
  providers: [EthWeb3Service, BlidEthService],
  exports: [EthWeb3Service, BlidEthService],
})
export class EthModule {}
