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

/**
 * Parameters for the token in the pool
 * @interface TokenParams
 */
export interface TokenParams {
  decimals: number;
  mutable: boolean;
}

export interface FactoryInitParams {
  shift: anchor.BN;
  initialTokenReserves: anchor.BN;
  feeParams: {
    normalizationPeriod: anchor.BN;
    decay: number;
    royaltiesBps: number;
  };
  tokenParams: {
    decimals: number;
    mutable: boolean;
  };
}

export interface FactoryLaunchParams {
  tokenConfig: {
    name: string;
    symbol: string;
    uri: string;
  };
  feeFreeBuys: number;
  reference: anchor.BN;
}
export const POOL_SEED = "pool";
