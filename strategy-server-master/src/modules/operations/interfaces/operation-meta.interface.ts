export interface OperationClaimPayload {
  wallet: string;
  earnUsd: string;
  earnBlid: string;
  priceBlid: string;
  lastTxBlockNumber: number | null;
}

export interface OperationMeta {
  adminBalanceBefore?: {
    bnbBalance: string;
    blidBalance: string;
  };
  boostBalanceBefore?: {
    bnbBalance: string;
    blidBalance: string;
  };
  adminBalanceAfter?: {
    bnbBalance: string;
    blidBalance: string;
  };
  boostBalanceAfter?: {
    bnbBalance: string;
    blidBalance: string;
  };
  payload?: OperationClaimPayload;
}
