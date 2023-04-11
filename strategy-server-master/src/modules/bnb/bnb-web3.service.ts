import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { ERROR_CODES } from 'src/common/constants/error-codes';
import { LogicException } from 'src/common/logic.exception';
import { ConfigService } from 'src/shared/services/config.service';
import { VaultService } from 'src/shared/services/vault.service';
import Web3 from 'web3';
import type { Account } from 'web3/eth/accounts';

import { BlockchainsService } from '../blockchains/blockchains.service';
import { RuntimeKeysService } from '../runtime-keys/runtime-keys.service';

// eslint-disable-next-line @typescript-eslint/naming-convention
export enum WEB3_CONTEXT {
  OPERATIONS = 'OPERATIONS',
  ANALYTICS = 'ANALYTICS',
}

@Injectable()
export class BnbWeb3Service {
  private readonly logger = new Logger(BnbWeb3Service.name);

  constructor(
    @Inject(forwardRef(() => ConfigService))
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => RuntimeKeysService))
    private readonly runtimeKeysService: RuntimeKeysService,
    private readonly vaultService: VaultService,
    private readonly blockchainsService: BlockchainsService,
  ) {}

  createInstance(web3Context: WEB3_CONTEXT = WEB3_CONTEXT.OPERATIONS) {
    const node = this.getNodeByContext(web3Context);

    return new Web3(node);
  }

  async createWeb3AndAccount(
    runtimePrivateKeyId: number,
    web3Context: WEB3_CONTEXT = WEB3_CONTEXT.OPERATIONS,
  ): Promise<{
    web3: Web3;
    web3Account: Account;
  }> {
    const web3 = await this.createInstance(web3Context);

    const runtimeKey = await this.runtimeKeysService.getById(
      runtimePrivateKeyId,
    );

    if (!runtimeKey) {
      throw new LogicException(
        ERROR_CODES.NOT_FOUND_RUNTIME_KEY(runtimePrivateKeyId),
      );
    }

    const runtimePrivateKeyValue = this.configService.isUseVault
      ? this.vaultService.getKeyValue(runtimeKey.name)
      : this.configService.getKeyValue(runtimeKey.name);

    let web3Account = null;

    web3Account = web3.eth.accounts.privateKeyToAccount(
      `0x${runtimePrivateKeyValue}`,
    );

    web3.eth.accounts.wallet.add(web3Account);
    web3.eth.defaultAccount = web3Account.address;

    this.logger.debug({
      message: 'createWeb3AndAccount',
      runtimeKey: runtimeKey.name,
      address: web3Account.address,
    });

    return {
      web3,
      web3Account,
    };
  }

  async executeWeb3Batch(web3: Web3, methods: any[]): Promise<any> {
    const { web3BatchSizeLimit } =
      await this.blockchainsService.getBnbBlockchainSettings();

    if (!web3BatchSizeLimit) {
      return this.executeWeb3LimitedBatch(web3, methods);
    }

    let result = [];

    const batchesCount = Math.ceil(methods.length / web3BatchSizeLimit);

    for (let i = 0; i < batchesCount; i++) {
      const data = await this.executeWeb3LimitedBatch(
        web3,
        methods.slice(i * web3BatchSizeLimit, (i + 1) * web3BatchSizeLimit),
      );
      result = [...result, ...data];
    }

    return result;
  }

  private async executeWeb3LimitedBatch(
    web3: Web3,
    methods: any[],
  ): Promise<any> {
    const batch = new web3.BatchRequest();

    const promises = [];

    for (const method of methods) {
      if (method !== null) {
        const promise = new Promise((resolve, reject) => {
          batch.add(
            method.call.request({}, (err: Error, res: any) => {
              if (err) {
                return reject(err);
              }

              return resolve(res);
            }),
          );
        });

        promises.push(promise);
      } else {
        promises.push(Promise.resolve(null));
      }
    }

    batch.execute();

    return Promise.all(promises);
  }

  private getNodeByContext(web3Context: WEB3_CONTEXT) {
    if (this.configService.nodeEnv === 'test') {
      return this.configService.networkUrls.bsc;
    }

    if (web3Context === WEB3_CONTEXT.ANALYTICS) {
      return this.configService.networkUrls.bsc;
    }

    return this.configService.networkUrls.bscQuikNode;
  }
}
