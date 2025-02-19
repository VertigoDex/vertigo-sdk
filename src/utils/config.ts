import * as anchor from "@coral-xyz/anchor";
import { FeeParams, PoolConfig } from "../types";

/**
 * Creates a pool configuration with default or custom parameters
 * @param {anchor.BN} [constant=new anchor.BN(100 * LAMPORTS_PER_SOL)] - Bonding curve constant in lamports
 * @param {anchor.BN} [initialTokenReserves=new anchor.BN(1_000_000_000_000_000)] - Initial token supply
 * @param {FeeParams} feeParams - Fee parameters for the pool
 * @returns {PoolConfig} Complete pool configuration object
 */
export function createPoolConfig(
  constant: anchor.BN = new anchor.BN(100 * anchor.web3.LAMPORTS_PER_SOL),
  initialTokenReserves: anchor.BN = new anchor.BN(1_000_000_000_000_000),
  feeParams: FeeParams
): PoolConfig {
  return {
    constant: new anchor.BN(constant),
    initialTokenReserves: new anchor.BN(initialTokenReserves),
    feeParams,
  };
}

// Helper function to create default fee params
/**
 * Creates fee parameters with default or custom values
 * @param {number} [normalizationPeriod=10] - Period over which fees are normalized (in slots)
 * @param {number} [decay=1.0] - Rate at which fees decay back to base rate (0.0 to 1.0)
 * @param {number} [royaltiesBps=50] - Royalty fee in basis points (1 bps = 0.01%)
 * @param {number} [protocolFeeBps=50] - Protocol fee in basis points (1 bps = 0.01%)
 * @param {number} [feeExemptBuys=0] - Number of initial buys exempt from fees
 * @returns {FeeParams} Fee parameters object
 */
export function createFeeParams(
  normalizationPeriod: number = 10,
  decay: number = 1.0,
  royaltiesBps: number = 50,
  protocolFeeBps: number = 50,
  feeExemptBuys: number = 0
): FeeParams {
  return {
    normalizationPeriod: new anchor.BN(normalizationPeriod),
    decay,
    reference: new anchor.BN(0),
    royaltiesBps,
    protocolFeeBps,
    feeExemptBuys,
  };
}
