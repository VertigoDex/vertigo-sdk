import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import type { Amm } from "../../target/types/amm";

export type QuoteBuyParams = {
  program: anchor.Program<Amm>;
  pool: PublicKey;
  owner: PublicKey;
  user: PublicKey;
  mintA: PublicKey;
  mintB: PublicKey;
  amount: anchor.BN;
  limit: anchor.BN;
};

export type QuoteBuyResult = {
  amountA: anchor.BN;
  amountB: anchor.BN;
  feeA: anchor.BN;
};

export const quoteBuy = async (
  params: QuoteBuyParams,
): Promise<QuoteBuyResult> => {
  const result = await params.program.methods
    .quoteBuy({
      amount: params.amount,
      limit: params.limit,
    })
    .accounts({
      pool: params.pool,
      owner: params.owner,
      user: params.user,
      mintA: params.mintA,
      mintB: params.mintB,
    })
    .view();

  return {
    amountA: result.amountA,
    amountB: result.amountB,
    feeA: result.feeA,
  };
};
