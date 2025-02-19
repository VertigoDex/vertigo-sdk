import * as anchor from "@coral-xyz/anchor";

/**
 * Parameters that control the fee structure of a pool
 * @interface FeeParams
 */
export interface FeeParams {
  /** Period over which fees are normalized (in slots) */
  normalizationPeriod: anchor.BN;
  /** Rate at which fees decay back to base rate */
  decay: number;
  /** Reference timestamp for fee calculations */
  reference: anchor.BN;
  /** Royalty fee in basis points (1/100th of a percent) */
  royaltiesBps: number;
  /** Protocol fee in basis points (1/100th of a percent) */
  protocolFeeBps: number;
  /** Number of buys exempt from fees */
  feeExemptBuys: number;
}
