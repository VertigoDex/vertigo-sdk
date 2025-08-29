import { Connection, Keypair, PublicKey, Signer } from "@solana/web3.js";
import { Network } from "../core/constants";
import * as anchor from "@coral-xyz/anchor";

export type WalletLike = anchor.Wallet | {
  publicKey: PublicKey;
  signTransaction?: (tx: any) => Promise<any>;
  signAllTransactions?: (txs: any[]) => Promise<any[]>;
};

export type VertigoConfig = {
  connection: Connection;
  wallet?: WalletLike;
  network?: Network;
  commitment?: anchor.web3.Commitment;
  skipPreflight?: boolean;
  apiUrl?: string;
  programs?: {
    amm?: PublicKey;
    poolAuthority?: PublicKey;
    splTokenFactory?: PublicKey;
    token2022Factory?: PublicKey;
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
};

export type SwapRoute = {
  pool: PublicKey;
  inputMint: PublicKey;
  outputMint: PublicKey;
  fee: number;
};

export type PoolData = {
  address: PublicKey;
  owner: PublicKey;
  mintA: PublicKey;
  mintB: PublicKey;
  reserveA: anchor.BN;
  reserveB: anchor.BN;
  totalSupply: anchor.BN;
  feeRate: number;
  volume24h?: anchor.BN;
  tvl?: anchor.BN;
  apy?: number;
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