import Safe from '@gnosis.pm/safe-core-sdk';
import { ethers, Signer, Contract } from "ethers";
import EthersAdapter from '@gnosis.pm/safe-ethers-lib';
import SafeServiceClient from '@gnosis.pm/safe-service-client'
import { 
  SafeTransactionDataPartial 
} from '@gnosis.pm/safe-core-sdk-types'
import {
  getTransactionQueue,
  getTransactionDetails, 
  TransactionListItemType,
} from '@gnosis.pm/safe-react-gateway-sdk'
import {TxTransaction} from '../utils/type'
import {EncodeTransaction} from '../utils/EncodeTransactionsTx'
import dotenv from "dotenv";

global.XMLHttpRequest = require('xhr2');

const SERVICE_URL = "https://safe-transaction.goerli.gnosis.io";
const MultiSendCallABI = [
  {
      "inputs":[
          {
              "internalType":"bytes",
              "name":"transactions",
              "type":"bytes"
          }],
      "name":"multiSend",
      "outputs":[],
      "stateMutability":"payable",
      "type":"function"
  }
];

export const multisig = async<T = any> (
  contract : Contract,
  methodName : string,
  param : string[],
  abi: string,
  signer: Signer
) => {

  const safeAddress = process.env.GNOSIS_SAFE_ADDRESS!;
  const ethAdapter = new EthersAdapter({ ethers, signer });
  const safe = await Safe.create({ ethAdapter, safeAddress });
  const safeService = new SafeServiceClient({txServiceUrl: SERVICE_URL, ethAdapter});    
  const moduleInterface = new ethers.utils.Interface(abi);
  const data = moduleInterface.encodeFunctionData(
    methodName,
    param
  );
  const allTransactions = await safeService.getMultisigTransactions(safe.getAddress());
  const num = allTransactions.count === 0 ? 1 : allTransactions.results[0].nonce + 1;    
  const transaction: SafeTransactionDataPartial = {
    to: contract.address,
    data: data,
    value: '0',
    operation: 0, // Optional
    safeTxGas: 0, // Optional
    baseGas: 0, // Optional
    gasPrice: 0, // Optional
    gasToken: '0x0000000000000000000000000000000000000000', // Optional
    refundReceiver: '0x0000000000000000000000000000000000000000', // Optional
    nonce: num, // Optional
  };
  const safeTransaction = await safe.createTransaction({safeTransactionData:transaction});
  const safeTransactionHash = await safe.getTransactionHash(safeTransaction)
  const safeTxHash = await safe.signTransactionHash(safeTransactionHash);
  const result = await safeService.proposeTransaction({
    safeAddress: safe.getAddress(),
    safeTransactionData: safeTransaction.data,
    safeTxHash: safeTransactionHash,
    senderAddress: (await signer.getAddress()),
    senderSignature: safeTxHash.data,
  });  
}

export const secondConfirmTransaction = async (
  owner: Signer
) => {

  const safeAddress = process.env.GNOSIS_SAFE_ADDRESS!;
  const ethAdapter = new EthersAdapter({ ethers, signer: owner });
  const safe = await Safe.create({ ethAdapter, safeAddress });
  const safeService = new SafeServiceClient({txServiceUrl: SERVICE_URL, ethAdapter});  
  const multisigtransactions = await safeService.getPendingTransactions(safeAddress);
  for (const element of multisigtransactions.results) {
    if (element.confirmations?.length! > 1)
      continue;
    const safeTxHash = await safe.signTransactionHash(element.safeTxHash);
    const confirm = await safeService.confirmTransaction(element.safeTxHash, safeTxHash.data);  
  }
}

export const executeBatch = async (
  signer: Signer
) => {
  const safeAddress = process.env.GNOSIS_SAFE_ADDRESS!;
  const MULTISENDER_ADDRESS = process.env.GNOSIS_SAFE_MULTICALL_ADDRESS!;

  const ethAdapter = new EthersAdapter({ ethers, signer: signer });
  const safe = await Safe.create({ ethAdapter, safeAddress });

  const chainId = await signer.getChainId();
  const queueTransaction = await getTransactionQueue(chainId.toString(), safeAddress);
  const txTransaction  : TxTransaction[] = [];
  for (const element of queueTransaction.results) {
    if (element.type == TransactionListItemType.TRANSACTION) {
      const details = await getTransactionDetails(chainId.toString(), element.transaction.id);
        txTransaction.push({
          ...element.transaction,
          txDetails: details
        });
      }
  }

  const version = await safe.getContractVersion();
  const account = await signer.getAddress();

  const transaction_data = EncodeTransaction(
    txTransaction, 
    safe.getAddress(), 
    version.toString(), 
    account,
    chainId.toString()
  );
  const instance = new Contract(MULTISENDER_ADDRESS, MultiSendCallABI);
  const gaslimit = await instance.connect(signer).estimateGas.multiSend(transaction_data);
  const result = await instance.connect(signer).multiSend(transaction_data, {gasLimit:gaslimit});
}