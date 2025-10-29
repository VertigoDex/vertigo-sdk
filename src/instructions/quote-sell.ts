import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import type { Amm } from "../../target/types/amm";

export type QuoteSellParams = {
  program: anchor.Program<Amm>;
  pool: PublicKey;
  owner: PublicKey;
  user: PublicKey;
  mintA: PublicKey;
  mintB: PublicKey;
  amount: anchor.BN;
  limit: anchor.BN;
};

export type QuoteSellResult = {
  amountA: anchor.BN;
  amountB: anchor.BN;
  feeA: anchor.BN;
};

export const quoteSell = async (
  params: QuoteSellParams,
): Promise<QuoteSellResult> => {
  const result = await params.program.methods
    .quoteSell({
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
