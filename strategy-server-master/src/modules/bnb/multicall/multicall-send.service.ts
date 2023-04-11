import { Injectable, Logger } from '@nestjs/common';
import type { ContractDto } from 'src/modules/contracts/dto/ContractDto';
import type Web3 from 'web3';
import type { ContractSendMethod } from 'web3-eth-contract';

import { LOGIC } from '../bolide/logic';
import { TransactionsService } from '../transactions.service';

@Injectable()
export class MulticallSendService {
  private readonly logger = new Logger(MulticallSendService.name);

  constructor(private readonly transactionsService: TransactionsService) {}

  public async sendMulticall({
    txArr,
    contract,
    web3,
    method,
    uid,
    isTransactionProdMode,
  }: {
    txArr: Array<{ tx: ContractSendMethod; meta: Record<string, unknown> }>;
    contract: ContractDto;
    web3: Web3;
    method: string;
    uid: string;
    isTransactionProdMode: boolean;
  }) {
    this.logger.debug({
      message: 'executing sendMulticall',
      txArr: txArr.length,
      method,
      uid,
    });

    if (txArr.length === 0) {
      return this.logger.debug({
        message: 'empty tx array for multicall, skipping',
        uid,
        method,
      });
    }

    const logicContract = new web3.eth.Contract(LOGIC.abi, contract.address);
    const txAbiArr = txArr.map(({ tx }) => tx.encodeABI());
    const mTx = await logicContract.methods.multicall(txAbiArr);

    await this.transactionsService.sendTransaction({
      transaction: mTx,
      meta: { multicall: txArr.map(({ meta }) => meta) },
      method,
      uid,
      func: 'multicall',
      web3,
      isTransactionProdMode,
    });
  }
}
