import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { omit } from 'lodash';
import { RollbarLogger } from 'nestjs-rollbar';
import { ERROR_CODES } from 'src/common/constants/error-codes';
import { LogicException } from 'src/common/logic.exception';
import type Web3 from 'web3';

import { BlockchainsService } from '../blockchains/blockchains.service';
import type { TransactionsByUidDto } from './dto/TransactionsByUidDto';
import type { TransactionsPageDto } from './dto/TransactionsPageDto';
import type { TransactionsPageOptionsDto } from './dto/TransactionsPageOptionsDto';
import type { BlockchainTransactionRaw } from './interfaces/blockchain-transaction-raw.interface';
import type { TransactionMeta } from './interfaces/transaction-meta.iterface';
import type { TransactionEntity } from './transaction.entity';
import { TransactionsRepository } from './transactions.repository';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    private readonly transactionsRepository: TransactionsRepository,
    @Inject(forwardRef(() => BlockchainsService))
    private readonly blockchainsService: BlockchainsService,
    private readonly rollbarLogger: RollbarLogger,
  ) {}

  async sendTransaction(data: {
    uid: string;
    web3: Web3;
    transaction: any;
    method: string;
    func: string;
    meta?: TransactionMeta;
    fromAddress?: string;
    isTransactionProdMode: boolean;
    isWaitingConfirmation?: boolean;
    doesReceiptLogsHaveErrors?: (receipt: any) => boolean;
  }) {
    const {
      transaction,
      method,
      meta,
      uid,
      func,
      web3,
      fromAddress = web3.eth.defaultAccount,
      isTransactionProdMode = true,
      isWaitingConfirmation = true,
      doesReceiptLogsHaveErrors = (receipt) => this.getErrorLogs(receipt),
    } = data;
    let gasAmount: number;
    let createdTransaction;

    if (isTransactionProdMode) {
      try {
        gasAmount = await transaction.estimateGas({ from: fromAddress });
        const gas = gasAmount + 50_000;
        const nonce = await web3.eth.getTransactionCount(
          fromAddress,
          'pending',
        );

        this.logger.debug({
          message: 'sendTransaction start',
          fromAddress,
          gas,
          nonce,
          isTransactionProdMode,
          method,
          func,
          meta,
          isWaitingConfirmation,
          doesReceiptLogsHaveErrors,
        });

        createdTransaction = await transaction.send({
          from: fromAddress,
          gas,
          nonce,
        });

        await this.transactionsRepository.saveTransaction({
          meta: {
            ...meta,
            gas,
            gasAmount,
            gasPrice: createdTransaction.effectiveGasPrice,
            gasUsed: createdTransaction.gasUsed,
            blockNumber: createdTransaction.blockNumber,
          },
          uid,
          func,
          method,
          hash: createdTransaction.transactionHash,
          transactionRaw: omit<BlockchainTransactionRaw>(createdTransaction, [
            'events',
            'logsBloom',
          ]) as any,
        });

        if (isWaitingConfirmation) {
          await this.waitConfirmation(
            web3,
            createdTransaction.transactionHash,
            uid,
            doesReceiptLogsHaveErrors,
          );
        }
      } catch (error) {
        this.logger.error({
          message: 'sendTransaction error',
          error,
          transaction: {
            currentProvider: transaction?._provider?.host,
            method: {
              name: transaction?._method?.name,
              signature: transaction?._method?.signature,
            },
            arguments: transaction?.arguments,
          },
          method,
          func,
          meta,
          fromAddress,
          isWaitingConfirmation,
          doesReceiptLogsHaveErrors,
        });

        throw error;
      }
    }

    const addLogs = isTransactionProdMode ? {} : { method, meta, func };

    this.logger.debug({
      message: 'sendTransaction done',
      isTransactionProdMode,
      transaction: {
        hash: createdTransaction?.transactionHash,
        ...addLogs,
      },
    });
  }

  private async waitConfirmation(
    web3: Web3,
    txHash: string,
    uid: string,
    doesReceiptLogsHaveErrors: (receipt: any) => boolean,
  ) {
    const bnbSettings =
      await this.blockchainsService.getBnbBlockchainSettings();

    return new Promise((resolve, reject) => {
      const TX_CONFIRMATION_TIMEOUT_MS = bnbSettings.txConfirmationTimeoutMs;
      const TX_CONFIRMATION_BLOCKS = bnbSettings.txConfirmationBlocks;

      // eslint-disable-next-line prefer-const
      let timeout;

      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      const interval = setInterval(async () => {
        try {
          const receipt = await web3.eth.getTransactionReceipt(txHash);

          if (receipt) {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            const { blockNumber, status } = receipt;
            const currentBlock = await web3.eth.getBlockNumber();

            if (currentBlock >= Number(blockNumber) + TX_CONFIRMATION_BLOCKS) {
              clearInterval(interval);
              clearTimeout(timeout);

              if (!status) {
                reject(
                  new LogicException(
                    ERROR_CODES.TX_STATUS_FAILED({ txHash, uid }),
                  ),
                );
              }

              if (doesReceiptLogsHaveErrors(receipt)) {
                reject(
                  new LogicException(
                    ERROR_CODES.TX_ERROR_LOGS_FAILED({ txHash, uid }),
                  ),
                );
              }

              resolve(receipt);
            }
          }
        } catch (error) {
          this.logger.warn({
            error,
            message: 'waitConfirmation',
            info: {
              TX_CONFIRMATION_TIMEOUT_MS,
              TX_CONFIRMATION_BLOCKS,
              txHash,
              uid,
            },
          });

          this.rollbarLogger.error('waitConfirmation', error);
        }
      }, 3000);

      timeout = setTimeout(() => {
        clearInterval(interval);
        clearTimeout(timeout);
        reject(
          new LogicException(ERROR_CODES.TX_WAITING_TIMEOUT({ txHash, uid })),
        );
      }, TX_CONFIRMATION_TIMEOUT_MS);
    });
  }

  private getErrorLogs(receipt: any): boolean {
    // keccak256(Failure(uint256,uint256,uint256)) https://github.com/VenusProtocol/venus-protocol/blob/v2.0.1/contracts/ErrorReporter.sol#L57
    const FAILURE_EVENT =
      '0x45b96fe442630264581b197e84bbada861235052c5a1aadfff9ea4e40a969aa0';

    const logs = receipt?.logs;

    if (logs && Array.isArray(logs)) {
      for (const log of logs) {
        if (
          log.topics &&
          Array.isArray(log.topics) &&
          log.topics.length === 1 &&
          log.topics[0].toUpperCase() === FAILURE_EVENT.toUpperCase()
        ) {
          return true;
        }
      }
    }

    return false;
  }

  async getTransactionsByUid(uid: string): Promise<TransactionsByUidDto> {
    return this.transactionsRepository.getTransactionsByUid(uid);
  }

  async getCountByOperationId(operationId: string): Promise<number> {
    return this.transactionsRepository.count({ uid: operationId });
  }

  async getItems(
    pageOptionsDto: TransactionsPageOptionsDto,
  ): Promise<TransactionsPageDto> {
    return this.transactionsRepository.getItems(pageOptionsDto);
  }

  async createTransaction(data: {
    meta: TransactionMeta;
    method: string;
    uid: string;
    func: string;
    hash: string;
    transactionRaw: BlockchainTransactionRaw;
  }): Promise<TransactionEntity> {
    return this.transactionsRepository.saveTransaction(data);
  }
}
