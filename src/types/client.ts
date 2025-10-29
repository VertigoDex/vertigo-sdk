import {
  Connection,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import { Network } from "../core/constants";
import * as anchor from "@coral-xyz/anchor";

export type WalletLike =
  | anchor.Wallet
  | {
      publicKey: PublicKey;
      signTransaction?: <T extends Transaction | VersionedTransaction>(
        tx: T,
      ) => Promise<T>;
      signAllTransactions?: <T extends Transaction | VersionedTransaction>(
        txs: T[],
      ) => Promise<T[]>;
    };

export type VertigoConfig = {
  connection?: Connection;
  wallet?: anchor.Wallet;
  network?: Network;
  commitment?: anchor.web3.Commitment;
  programId?: PublicKey;
  skipPreflight?: boolean;
  apiUrl?: string;
  programs?: {
    amm?: PublicKey;
    poolAuthority?: PublicKey;
    permissionedRelay?: PublicKey;
  };
  cache?: {
    enabled?: boolean;
    ttl?: number;
  };
  priority?: {
    autoFee?: boolean;
    baseFee?: number;
    maxFee?: number;
  };
};

export type SwapQuote = {
  inputMint: PublicKey;
  outputMint: PublicKey;
  inputAmount: anchor.BN;
  outputAmount: anchor.BN;
  fee: anchor.BN;
  priceImpact: number;
  minimumReceived: anchor.BN;
  route: SwapRoute[];
  // Legacy properties for backwards compatibility
  amountIn: anchor.BN;
  estimatedAmountOut: anchor.BN;
  minimumAmountOut: anchor.BN;
  priceImpactPct: number;
};

export type SwapRoute = {
  pool: PublicKey;
  inputMint: PublicKey;
  outputMint: PublicKey;
  fee: number;
};

export type PoolAccount = {
  owner: PublicKey;
  mintA: PublicKey;
  mintB: PublicKey;
  reserveA: anchor.BN;
  reserveB: anchor.BN;
  totalSupply: anchor.BN;
  feeRate: number;
};

export type PoolData = {
  address: PublicKey;
  owner: PublicKey;
  mintA: PublicKey;
  mintB: PublicKey;
  tokenProgramA: PublicKey;
  tokenProgramB: PublicKey;
  reserveA: anchor.BN;
  reserveB: anchor.BN;
  totalSupply: anchor.BN;
  feeRate: number;
  volume24h?: anchor.BN;
  tvl?: anchor.BN;
  apy?: number;
  // Legacy properties for backwards compatibility
  publicKey: PublicKey;
  account: PoolAccount;
};

export type TransactionOptions = {
  skipPreflight?: boolean;
  commitment?: anchor.web3.Commitment;
  priorityFee?: number | "auto";
  computeUnits?: number;
  retries?: number;
  simulateFirst?: boolean;
};

export type SwapOptions = TransactionOptions & {
  slippageBps?: number;
  wrapSol?: boolean;
  unwrapSol?: boolean;
  referral?: PublicKey;
};
