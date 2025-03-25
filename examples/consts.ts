import type { FactoryPoolConfig, PoolConfig } from "../src/types/pool";
import * as anchor from "@coral-xyz/anchor";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

export const DECIMALS = 6;

// Pool configuration parameters
export const POOL_PARAMS: PoolConfig = {
  shift: new anchor.BN(LAMPORTS_PER_SOL).muln(100), // 100 virtual SOL
  initialTokenBReserves: new anchor.BN(1_000_000_000).muln(10 ** DECIMALS), // 1 billion tokens
  feeParams: {
    normalizationPeriod: new anchor.BN(20), // 20 slots
    decay: 10,
    royaltiesBps: 100, // 1%
    feeExemptBuys: 1,
    reference: new anchor.BN(0),
  },
};

export const FACTORY_PARAMS: FactoryPoolConfig = {
  shift: new anchor.BN(LAMPORTS_PER_SOL).muln(100), // 100 virtual SOL
  initialTokenReserves: new anchor.BN(1_000_000_000).muln(10 ** DECIMALS),
  feeParams: {
    normalizationPeriod: new anchor.BN(20),
    decay: 10,
    royaltiesBps: 100, // 1%
  },
  tokenParams: {
    decimals: DECIMALS,
    mutable: true,
  },
};
