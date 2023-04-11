import {
  TransactionDetails,
  MultisigExecutionDetails,
  MultisigExecutionInfo,
  Operation,
  Erc20Transfer,
  Erc721Transfer,
  TransactionInfo,
  TransactionTokenType,
} from '@gnosis.pm/safe-react-gateway-sdk'
import {
  getSafeL2SingletonDeployment,
  SingletonDeployment,
} from '@gnosis.pm/safe-deployments'
import { List as iList } from 'immutable'
import {
  TxTransaction, 
  Transaction, 
  GnosisSafe, 
  TxInfoProps,
  Confirmation,
  makeConfirmation,
  TxArgs,
  NonPayableTransactionObject
} from './type'
import Web3 from 'web3'

const EMPTY_DATA = '0x'
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
const JSON_RPC = "https://bsc-dataseed1.binance.org/";

const getSafeContractDeployment = ({ safeVersion, chainId }: { safeVersion: string, chainId: string }): SingletonDeployment | undefined => {
  const networkId = chainId;
  const getDeployment = getSafeL2SingletonDeployment;

  return (
    getDeployment({
      version: safeVersion,
      network: networkId.toString(),
    }) ||
    getDeployment({
      version: safeVersion,
    })
  )
}

const getTxRecipient = (txInfo: TransactionInfo, safeAddress: string): string => {
  switch (txInfo.type) {
    case 'Transfer':
      if (txInfo.transferInfo.type === TransactionTokenType.NATIVE_COIN) {
        return txInfo.recipient.value
      } else {
        return (txInfo.transferInfo as Erc20Transfer | Erc721Transfer).tokenAddress
      }
    case 'Custom':
      return txInfo.to.value
    case 'Creation':
    case 'SettingsChange':
    default:
      return safeAddress
  }
}

const getTxValue = (txInfo: TransactionInfo, txDetails: TransactionDetails): string => {
  switch (txInfo.type) {
    case 'Transfer':
      if (txInfo.transferInfo.type === TransactionTokenType.NATIVE_COIN) {
        return txInfo.transferInfo.value
      } else {
        return txDetails.txData?.value ?? '0'
      }
    case 'Custom':
      return txInfo.value
    case 'Creation':
    case 'SettingsChange':
    default:
      return '0'
  }
}  

const getTxInfo = (transaction: TxTransaction, safeAddress: string): TxInfoProps => {
  if (!transaction.txDetails) return {} as TxInfoProps

  const DEFAULT_TX_INFO = {
    data: EMPTY_DATA,
    baseGas: '0',
    gasPrice: '0',
    safeTxGas: '0',
    gasToken: ZERO_ADDRESS,
    nonce: 0,
    refundReceiver: ZERO_ADDRESS,
    valueInWei: getTxValue(transaction.txInfo, transaction.txDetails),
    to: getTxRecipient(transaction.txInfo, safeAddress),
    operation: Operation.CALL,
  }
  
  const { baseGas, gasPrice, safeTxGas, gasToken, refundReceiver } = transaction.txDetails.detailedExecutionInfo as MultisigExecutionDetails
  const data = transaction.txDetails.txData?.hexData ?? DEFAULT_TX_INFO.data
  const nonce = (transaction.executionInfo as MultisigExecutionInfo).nonce
  const operation = transaction.txDetails.txData?.operation ?? DEFAULT_TX_INFO.operation

  return {
    ...DEFAULT_TX_INFO,
    data,
    baseGas,
    gasPrice,
    safeTxGas,
    gasToken,
    nonce,
    refundReceiver: refundReceiver.value,
    operation,
  }
}  

const getTxConfirmations = (transaction: TxTransaction): iList<Confirmation> => {
  if (!transaction.txDetails || !transaction.txDetails.detailedExecutionInfo) return iList([])

  return iList(
    (transaction.txDetails.detailedExecutionInfo as MultisigExecutionDetails).confirmations.map(({ signer, signature }) =>
      makeConfirmation({ owner: signer.value, signature }),
    ),
  )
}

const getPreValidatedSignatures = (from: string, initialString: string = EMPTY_DATA): string => {
  return `${initialString}000000000000000000000000${from.replace(
    EMPTY_DATA,
    '',
  )}000000000000000000000000000000000000000000000000000000000000000001`
}

const generateSignaturesFromTxConfirmations = (
  confirmations?: iList<Confirmation>,
  preApprovingOwner?: string,
): string => {
  let confirmationsMap =
    confirmations?.map((value) => {
      return {
        signature: value.signature,
        owner: value.owner.toLowerCase(),
      }
    }) || iList([])

  if (preApprovingOwner) {
    confirmationsMap = confirmationsMap.push({ owner: preApprovingOwner, signature: null })
  }

  // The constant parts need to be sorted so that the recovered signers are sorted ascending
  // (natural order) by address (not checksummed).
  confirmationsMap = confirmationsMap.sort((ownerA, ownerB) => ownerA.owner.localeCompare(ownerB.owner))

  let sigs = '0x'
  confirmationsMap.forEach(({ signature, owner }) => {
    if (signature) {
      sigs += signature.slice(2)
    } else {
      // https://docs.gnosis.io/safe/docs/contracts_signatures/#pre-validated-signatures
      sigs += getPreValidatedSignatures(owner, '')
    }
  })

  return sigs
}

const getExecutionTransaction = ({
  baseGas,
  data,
  gasPrice,
  gasToken,
  operation,
  refundReceiver,
  safeInstance,
  safeTxGas,
  sigs,
  to,
  valueInWei,
}: TxArgs): NonPayableTransactionObject<boolean> => {
  try {
    return safeInstance.methods.execTransaction(
      to,
      valueInWei,
      data,
      operation,
      safeTxGas,
      baseGas,
      gasPrice,
      gasToken,
      refundReceiver,
      sigs,
    )
  } catch (err) {
    console.error(`Error while creating transaction: ${err}`)

    throw err
  }
}  

const toMultiSendTxs = (
  transactions: TxTransaction[],
  safeAddress: string,
  safeVersion: string,
  account: string,
  chainId: string
): Transaction[] => {

  const web3 = new Web3(JSON_RPC);
  const safeSingletonDeployment = getSafeContractDeployment({ safeVersion, chainId })
  const safeInstance = safeSingletonDeployment && new web3.eth.Contract(
    safeSingletonDeployment.abi, 
    safeAddress
  ) as unknown as GnosisSafe
  if (safeInstance == undefined){
    return [];
  }

  return transactions.map((transaction) => {
    const txInfo = getTxInfo(transaction, safeAddress)
    const confirmations = getTxConfirmations(transaction)
    const sigs = generateSignaturesFromTxConfirmations(confirmations)

    const txArgs: TxArgs = { ...txInfo, sigs, safeInstance, sender: account }
    const data = getExecutionTransaction(txArgs).encodeABI()

    return {
      to: safeAddress,
      value: '0',
      data,
    }
  })
}

const getMultiSendJoinedTxs = (txs: Transaction[]): string => {
  // const provider = new JsonRpcProvider(JSON_RPC);

  const web3 = new Web3(JSON_RPC);

  const joinedTxs = txs
    .map((tx) =>
      [
        web3.eth.abi.encodeParameter('uint8', 0).slice(-2),
        web3.eth.abi.encodeParameter('address', tx.to).slice(-40),
        // if you pass wei as number, it will overflow
        web3.eth.abi.encodeParameter('uint256', tx.value.toString()).slice(-64),
        web3.eth.abi.encodeParameter('uint256', web3.utils.hexToBytes(tx.data).length).slice(-64),
        tx.data.replace(/^0x/, ''),
      ].join(''),
    )
    .join('')

  return `0x${joinedTxs}`
}

export function EncodeTransaction(
  transactions: TxTransaction[],
  safeAddress: string,
  safeVersion: string,
  account: string,
  chainId: string
): string {

  const txMultiData = toMultiSendTxs(
    transactions, 
    safeAddress, 
    safeVersion, 
    account,
    chainId
  );
  const transaction_data = getMultiSendJoinedTxs(txMultiData);  
  return transaction_data;

}