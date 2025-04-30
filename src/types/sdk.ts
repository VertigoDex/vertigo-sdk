import * as anchor from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import {
  WalletAdapterProps,
  SignerWalletAdapterProps,
} from "node_modules/@solana/wallet-adapter-base/lib/types";

export interface SDKConfig {
  /** Log level for SDK operations */
  logLevel?: "verbose" | "tx" | "none";
  /** Explorer to use for transaction links */
  explorer?: "solscan" | "solanaExplorer";
  /** AMM program ID */
  ammProgramId: string;
  /** Token2022 factory program ID */
  token2022FactoryProgramId: string;
  /** SPL Token factory program ID */
  splTokenFactoryProgramId: string;
}

export interface DevBuyArgs {
  amount: anchor.BN;
  limit: anchor.BN;
  dev: Keypair;
  devTaA: PublicKey;
}

export type SignerLike =
  | Keypair
  | anchor.Wallet
  | (WalletAdapterProps & SignerWalletAdapterProps);
