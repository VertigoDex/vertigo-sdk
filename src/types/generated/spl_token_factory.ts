import { PublicKey } from "@solana/web3.js";
import { Keypair } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

/** Type definition */
export interface Factory {
  owner: PublicKey;
  shift: BN;
  initialTokenReserves: BN;
  feeParams: FeeParams;
  tokenParams: TokenParams;
  bump: number;
  mintA: PublicKey;
}

/** Type definition */
export interface FactoryInitialized {
  owner: PublicKey;
  mintA: PublicKey;
}

/** Type definition */
export interface FeeParams {
  /** The normalization period in slots.
   * During this period, the fee will decay from 100% to the base fee. */
  normalizationPeriod: BN;
  /** Normalization period fee decay rate.
   * Higher values decay faster. */
  decay: number;
  /** Royalties in basis points. */
  royaltiesBps: number;
}

/** Type definition */
export interface InitializeParams {
  shift: BN;
  initialTokenReserves: BN;
  feeParams: FeeParams;
  tokenParams: TokenParams;
  nonce: number;
}

/** Type definition */
export interface LaunchParams {
  tokenConfig: TokenMetaData;
  reference: BN;
  privilegedSwapper: PublicKey | null;
  nonce: number;
}

/** Type definition */
export interface TokenMetaData {
  name: string;
  symbol: string;
  uri: string;
}

/** Type definition */
export interface TokenParams {
  decimals: number;
  mutable: boolean;
}

/** Request type for initialize instruction */
export interface InitializeRequest {
  /** payer account - This account needs to sign the transaction */
  payer: Keypair;
  /** owner account - This account needs to sign the transaction */
  owner: Keypair;
  /** mint_a account */
  mintA: PublicKey;

  /** Instruction parameters */
  params: InitializeParams;
}

/** Request type for launch instruction */
export interface LaunchRequest {
  /** payer account - This account needs to sign the transaction */
  payer: Keypair;
  /** owner account - This account needs to sign the transaction */
  owner: Keypair;
  /** mint_b_authority account - This account needs to sign the transaction */
  mintBAuthority: Keypair;
  /** mint_b account - This account needs to sign the transaction */
  mintB: Keypair;
  /** mint_a account */
  mintA: PublicKey;
  /** token_program_a account */
  tokenProgramA: PublicKey;

  /** Instruction parameters */
  params: LaunchParams;
}
