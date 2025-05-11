export interface TonProof {
  proof: {
    timestamp: number;
    domain: string;
    signature: string;
    payload: string;
  };
}

export interface Account {
  address: string;
  publicKey: string;
  chain: string;
  walletStateInit?: string; // Для совместимости с challenge.service.ts
}
