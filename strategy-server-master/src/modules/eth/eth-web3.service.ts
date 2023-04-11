import { Injectable } from '@nestjs/common';
import { ConfigService } from 'src/shared/services/config.service';
import Web3 from 'web3';

@Injectable()
export class EthWeb3Service {
  constructor(private readonly configService: ConfigService) {}

  createInstance(url?: string) {
    const node = url ? url : this.configService.networkUrls.eth;

    return new Web3(node);
  }
}
