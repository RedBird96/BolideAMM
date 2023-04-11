import { Token } from '@bolide/swap-sdk';
import { Injectable, Logger } from '@nestjs/common';
import { ERROR_CODES } from 'src/common/constants/error-codes';
import { LogicException } from 'src/common/logic.exception';
import { ContractsService } from 'src/modules/contracts/contracts.service';

import { BSC_CHAIN_ID } from './utils/utils';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(private readonly contractsService: ContractsService) {}

  public async getTokenBySymbol(symbol: string, blockchainId: number) {
    const contract = await this.contractsService.getTokenByName(
      blockchainId,
      symbol,
    );

    if (contract) {
      return new Token(BSC_CHAIN_ID, contract.address, 18, symbol);
    }

    throw new LogicException(
      ERROR_CODES.DEX_AGGREGATOR.INVALID_TOKEN_TRADE(symbol),
    );
  }
}
