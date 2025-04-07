import * as anchor from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";

export interface SDKConfig {
  /** Log level for SDK operations */
  logLevel?: "verbose" | "tx" | "none";
  /** Explorer to use for transaction links */
  explorer?: "solscan" | "solanaExplorer";
  /** Path to the AMM program IDL */
  ammProgramPath?: string;
  /** Custom AMM program ID */
  ammProgramIdOverride?: string;
  /** Path to the Token2022 program IDL */
  token2022ProgramPath?: string;
  /** Custom Token2022 program ID */
  token2022ProgramIdOverride?: string;
  /** Path to the SPL Token program IDL */
  splTokenProgramPath?: string;
  /** Custom SPL Token program ID */
  splTokenProgramIdOverride?: string;
}

export interface DevBuyArgs {
  devBuyAmount: anchor.BN;
  dev: Keypair;
  devTaA: PublicKey;
}
