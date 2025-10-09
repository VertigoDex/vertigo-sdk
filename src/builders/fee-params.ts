import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

export type FeeParams = {
  normalizationPeriod: anchor.BN;
  decay: number;
  royaltiesBps: number;
  privilegedSwapper?: PublicKey;
  reference: anchor.BN;
};

export type FeeParamsOptions = {
  normalizationPeriod?: number | anchor.BN;
  decay?: number;
  royaltiesBps: number;
  privilegedSwapper?: PublicKey;
  reference?: number | anchor.BN;
};

export const buildFeeParams = (options: FeeParamsOptions): FeeParams => {
  const normalizationPeriod = options.normalizationPeriod
    ? typeof options.normalizationPeriod === "number"
      ? new anchor.BN(options.normalizationPeriod)
      : options.normalizationPeriod
    : new anchor.BN(3600);

  const reference = options.reference
    ? typeof options.reference === "number"
      ? new anchor.BN(options.reference)
      : options.reference
    : new anchor.BN(Math.floor(Date.now() / 1000));

  if (options.royaltiesBps < 0 || options.royaltiesBps > 10000) {
    throw new Error(
      `Invalid royaltiesBps: ${options.royaltiesBps} (must be between 0 and 10000)`
    );
  }

  if (options.decay !== undefined && (options.decay < 0 || options.decay > 1)) {
    throw new Error(
      `Invalid decay: ${options.decay} (must be between 0 and 1)`
    );
  }

  return {
    normalizationPeriod,
    decay: options.decay ?? 0.99,
    royaltiesBps: options.royaltiesBps,
    privilegedSwapper: options.privilegedSwapper,
    reference,
  };
};
