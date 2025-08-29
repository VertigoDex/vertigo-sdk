import { PublicKey } from "@solana/web3.js";

import { BN } from "@coral-xyz/anchor";

import { SignerLike } from "../../types/sdk";

/** Event type - emitted by the program */
export interface BuyEvent {
  amountIn: BN;
  amountOut: BN;
}

/** Type definition */
export interface CreateParams {
  shift: BN;
  initialTokenBReserves: BN;
  feeParams: FeeParams;
}

/** Type definition */
export interface FeeParams {
  /** The normalization period in slots.
   * During this period, the fee will decay from 100% to the base fee. */
  normalizationPeriod: BN;
  /** Normalization period fee decay rate.
   * Higher values decay faster. */
  decay: number;
  /** Reference slot for the fee calculation. */
  reference: BN;
  /** Royalties in basis points. */
  royaltiesBps: number;
  /** Number of fee exempt buys. */
  privilegedSwapper: PublicKey | null;
}

/** Type definition */
export interface Pool {
  enabled: boolean;
  owner: PublicKey;
  mintA: PublicKey;
  mintB: PublicKey;
  tokenAReserves: BN;
  tokenBReserves: BN;
  shift: BN;
  royalties: BN;
  vertigoFees: BN;
  bump: number;
  feeParams: FeeParams;
}

/** Type definition */
export interface PoolCreated {
  pool: PublicKey;
  mintA: PublicKey;
  mintB: PublicKey;
  owner: PublicKey;
  initialTokenReserves: BN;
  shift: BN;
  feeParams: FeeParams;
}

/** Event type - emitted by the program */
export interface SellEvent {
  amountIn: BN;
  amountOut: BN;
}

/** Type definition */
export interface SwapParams {
  amount: BN;
  limit: BN;
}

/** Type definition */
export interface SwapResponse {
  newReservesA: BN;
  newReservesB: BN;
  amountA: BN;
  amountB: BN;
  feeA: BN;
}

/** Request type for buy instruction */
export interface BuyRequest {
  /** user account - This account needs to sign the transaction */
  user: SignerLike;
  /** owner account */
  owner: PublicKey;
  /** mint_a account */
  mintA: PublicKey;
  /** mint_b account */
  mintB: PublicKey;
  /** user_ta_a account */
  userTaA: PublicKey;
  /** user_ta_b account */
  userTaB: PublicKey;
  /** token_program_a account */
  tokenProgramA: PublicKey;
  /** token_program_b account */
  tokenProgramB: PublicKey;

  /** Instruction parameters */
  params: SwapParams;
}

/** Request type for claim instruction */
export interface ClaimRequest {
  /** pool account */
  pool: PublicKey;
  /** claimer account - This account needs to sign the transaction */
  claimer: SignerLike;
  /** mint_a account */
  mintA: PublicKey;
  /** receiver_ta_a account */
  receiverTaA: PublicKey;
  /** token_program_a account */
  tokenProgramA: PublicKey;
}

/** Request type for create instruction */
export interface CreateRequest {
  /** payer account - This account needs to sign the transaction */
  payer: SignerLike;
  /** owner account - This account needs to sign the transaction */
  owner: SignerLike;
  /** token_wallet_authority account - This account needs to sign the transaction */
  tokenWalletAuthority: SignerLike;
  /** mint_a account */
  mintA: PublicKey;
  /** mint_b account */
  mintB: PublicKey;
  /** token_wallet_b account */
  tokenWalletB: PublicKey;
  /** token_program_a account */
  tokenProgramA: PublicKey;
  /** token_program_b account */
  tokenProgramB: PublicKey;

  /** Instruction parameters */
  params: CreateParams;
}

/** Request type for quote_buy instruction */
export interface QuoteBuyRequest {
  /** owner account */
  owner: PublicKey;
  /** user account */
  user: PublicKey;
  /** mint_a account */
  mintA: PublicKey;
  /** mint_b account */
  mintB: PublicKey;

  /** Instruction parameters */
  params: SwapParams;
}

/** Request type for quote_sell instruction */
export interface QuoteSellRequest {
  /** owner account */
  owner: PublicKey;
  /** user account */
  user: PublicKey;
  /** mint_a account */
  mintA: PublicKey;
  /** mint_b account */
  mintB: PublicKey;

  /** Instruction parameters */
  params: SwapParams;
}

/** Request type for sell instruction */
export interface SellRequest {
  /** user account - This account needs to sign the transaction */
  user: SignerLike;
  /** owner account */
  owner: PublicKey;
  /** mint_a account */
  mintA: PublicKey;
  /** mint_b account */
  mintB: PublicKey;
  /** user_ta_a account */
  userTaA: PublicKey;
  /** user_ta_b account */
  userTaB: PublicKey;
  /** token_program_a account */
  tokenProgramA: PublicKey;
  /** token_program_b account */
  tokenProgramB: PublicKey;

  /** Instruction parameters */
  params: SwapParams;
}
