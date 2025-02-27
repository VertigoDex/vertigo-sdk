import * as anchor from "@coral-xyz/anchor";
import type { FeeParams } from "./fees";

/**
 * Configuration parameters for launching a new pool
 * @interface launchConfig
 */
export interface PoolConfig {
  /** Shift in the constant product formula */
  shift: anchor.BN;
  /** Initial token supply for the pool */
  initialTokenBReserves: anchor.BN;
  /** Fee parameters for the pool */
  feeParams: FeeParams;
}

export interface FactoryPoolConfig {
  /** Shift in the constant product formula */
  shift: anchor.BN;
  /** Initial token supply for the pool */
  initialTokenReserves: anchor.BN;
  /** Fee parameters for the pool */
  feeParams: FeeParams;
}

export const POOL_SEED = "pool";
