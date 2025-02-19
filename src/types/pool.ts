import * as anchor from "@coral-xyz/anchor";
import { FeeParams } from "./fees";

/**
 * Configuration parameters for launching a new pool
 * @interface launchConfig
 */
export interface PoolConfig {
  /** Constant in the bonding curve formula (in lamports) */
  constant: anchor.BN;
  /** Initial token supply for the pool */
  initialTokenReserves: anchor.BN;
  /** Fee parameters for the pool */
  feeParams: FeeParams;
}
