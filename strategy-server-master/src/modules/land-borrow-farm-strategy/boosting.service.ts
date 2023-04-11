import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { ERROR_CODES } from 'src/common/constants/error-codes';
import { LogicException } from 'src/common/logic.exception';
import type Web3 from 'web3';
import type { Account } from 'web3/eth/accounts';

import type { WalletBalances } from '../bnb/balance.service';
import { BalanceService } from '../bnb/balance.service';
import { BnbWeb3Service } from '../bnb/bnb-web3.service';
import { RuntimeKeysService } from '../runtime-keys/runtime-keys.service';
import { StrategiesService } from '../strategies/strategies.service';

@Injectable()
export class BoostingService {
  private readonly logger = new Logger(BoostingService.name);

  constructor(
    private bnbWeb3Service: BnbWeb3Service,
    private balanceService: BalanceService,
    @Inject(forwardRef(() => StrategiesService))
    private strategiesService: StrategiesService,
    private runtimeKeysService: RuntimeKeysService,
  ) {}

  async getBoostingBalances(strategyId: number): Promise<WalletBalances> {
    const { web3Account, web3 } = await this.getBoostingWeb3AndAccount(
      strategyId,
    );

    return this.balanceService.getWalletBalances({
      address: web3Account.address,
      web3,
    });
  }

  async getBoostingWeb3AndAccount(
    strategyId: number,
  ): Promise<{ web3: Web3; web3Account: Account }> {
    const strategy = await this.strategiesService.getStrategyById(strategyId);

    const { boostingPrivateKeyId } = strategy;

    const runtimeKey = await this.runtimeKeysService.getById(
      boostingPrivateKeyId,
    );

    if (!runtimeKey) {
      throw new LogicException(ERROR_CODES.STRATEGY_NOT_SET_BOOSTING_KEY);
    }

    return this.bnbWeb3Service.createWeb3AndAccount(boostingPrivateKeyId);
  }
}
