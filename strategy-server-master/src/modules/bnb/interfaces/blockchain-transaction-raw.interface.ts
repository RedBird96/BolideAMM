export interface BlockchainTransactionRaw {
  transactionHash: string;
  blockHash: string;
  blockNumber: number;
  cumulativeGasUsed: number;
  from: string;
  status: boolean;
  to: string;
  contractAddress: string;
  gasUsed: number;
  logsBloom: string;
  transactionIndex: number;
  type: string;
}
