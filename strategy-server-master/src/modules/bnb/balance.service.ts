import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { ERROR_CODES } from 'src/common/constants/error-codes';
import { LogicException } from 'src/common/logic.exception';
import { fromWeiToStr, toBN } from 'src/common/utils/big-number-utils';
import { ConfigService } from 'src/shared/services/config.service';
import { VaultService } from 'src/shared/services/vault.service';
import type Web3 from 'web3';

import { BlockchainsService } from '../blockchains/blockchains.service';
import { TOKEN_NAMES } from '../contracts/constants/token-names';
import { ContractsService } from '../contracts/contracts.service';
import { RuntimeKeysService } from '../runtime-keys/runtime-keys.service';
import { StrategiesService } from '../strategies/strategies.service';
import { BnbWeb3Service } from './bnb-web3.service';
import { ERC_20 } from './bolide/erc-20';

export interface WalletBalances {
  bnbBalance: string;
  blidBalance: string;
}

@Injectable()
export class BalanceService {
  constructor(
    @Inject(forwardRef(() => ConfigService))
    private readonly configService: ConfigService,
    private readonly bnbWeb3Service: BnbWeb3Service,
    private readonly blockchainService: BlockchainsService,
    private readonly contractsService: ContractsService,
    private readonly vaultService: VaultService,
    @Inject(forwardRef(() => StrategiesService))
    private readonly strategiesService: StrategiesService,
    private readonly runtimeKeysService: RuntimeKeysService,
  ) {}

  async getAdminBalances(data: {
    strategyId: number;
    web3: Web3;
  }): Promise<WalletBalances> {
    const { strategyId, web3 } = data;

    const strategy = await this.strategiesService.getStrategyById(strategyId);

    const { operationsPrivateKeyId } = strategy;

    const runtimeKey = await this.runtimeKeysService.getById(
      operationsPrivateKeyId,
    );

    if (!runtimeKey) {
      throw new LogicException(ERROR_CODES.STRATEGY_NOT_SET_OPERATIONS_KEY);
    }

    const runtimeOperationsKeyValue = this.configService.isUseVault
      ? this.vaultService.getKeyValue(runtimeKey.name)
      : this.configService.getKeyValue(runtimeKey.name);

    if (!runtimeOperationsKeyValue) {
      throw new LogicException(
        ERROR_CODES.RUNTIME_KEY_VALUE_IS_NIL(runtimeKey.name),
      );
    }

    const { web3: operationsWeb3 } =
      await this.bnbWeb3Service.createWeb3AndAccount(operationsPrivateKeyId);

    const { address: adminWalletAddress } =
      operationsWeb3.eth.accounts.privateKeyToAccount(
        `0x${runtimeOperationsKeyValue}`,
      );

    return this.getWalletBalances({ address: adminWalletAddress, web3 });
  }

  async getWalletBalances(data: {
    address: string;
    web3: Web3;
  }): Promise<WalletBalances> {
    const { address, web3 } = data;

    const bnbBlockchain = await this.blockchainService.getBnbBlockchainEntity();

    const blidToken = await this.contractsService.getTokenByName(
      bnbBlockchain.id,
      TOKEN_NAMES.BLID,
    );

    const blidContract = new web3.eth.Contract(ERC_20.abi, blidToken.address);

    const bnbBalance = fromWeiToStr(toBN(await web3.eth.getBalance(address)));
    const blidBalance = fromWeiToStr(
      await blidContract.methods.balanceOf(address).call(),
    );

    return {
      bnbBalance,
      blidBalance,
    };
  }
}
