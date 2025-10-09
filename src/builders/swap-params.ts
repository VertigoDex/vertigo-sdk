import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import type { Amm } from "../../target/types/amm";
import { SwapParams } from "../helpers/swap";
import { DEFAULT_SLIPPAGE_BPS } from "../core/constants";

export type SwapParamsOptions = {
  program: anchor.Program<Amm>;
  connection: Connection;
  pool: PublicKey;
  inputMint: PublicKey;
  outputMint: PublicKey;
  amount: number | anchor.BN;
  user: PublicKey;
  slippageBps?: number;
  wrapSol?: boolean;
  unwrapSol?: boolean;
  priorityFee?: number;
  computeUnits?: number;
};

export const buildSwapParams = (options: SwapParamsOptions): SwapParams => {
  const amount =
    typeof options.amount === "number"
      ? new anchor.BN(options.amount)
      : options.amount;

  return {
    program: options.program,
    connection: options.connection,
    pool: options.pool,
    inputMint: options.inputMint,
    outputMint: options.outputMint,
    amount,
    user: options.user,
    slippageBps: options.slippageBps ?? DEFAULT_SLIPPAGE_BPS,
    wrapSol: options.wrapSol ?? false,
    unwrapSol: options.unwrapSol ?? false,
    priorityFee: options.priorityFee,
    computeUnits: options.computeUnits,
  };
};
