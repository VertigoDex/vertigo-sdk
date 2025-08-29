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
}

export type SignerLike =
  | Keypair
  | anchor.Wallet
  | (WalletAdapterProps & SignerWalletAdapterProps);
