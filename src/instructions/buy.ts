import * as anchor from "@coral-xyz/anchor";
import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";
import type { Amm } from "../../target/types/amm";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

export type BuyInstructionParams = {
  program: anchor.Program<Amm>;
  pool: PublicKey;
  user: PublicKey;
  owner: PublicKey;
  mintA: PublicKey;
  mintB: PublicKey;
  userTaA: PublicKey;
  userTaB: PublicKey;
  vaultA: PublicKey;
  vaultB: PublicKey;
  amount: anchor.BN;
  limit: anchor.BN;
  tokenProgramA?: PublicKey;
  tokenProgramB?: PublicKey;
};

export type BuyParams = BuyInstructionParams & {
  signers?: anchor.web3.Signer[];
};

export const buyInstruction = async (
  params: BuyInstructionParams,
): Promise<TransactionInstruction> => {
  // @ts-ignore - Anchor type instantiation depth limitation
  const ix = await params.program.methods
    .buy({
      amount: params.amount,
      limit: params.limit,
    })
    .accounts({
      pool: params.pool,
      user: params.user,
      owner: params.owner,
      mintA: params.mintA,
      mintB: params.mintB,
      userTaA: params.userTaA,
      userTaB: params.userTaB,
      vaultA: params.vaultA,
      vaultB: params.vaultB,
      tokenProgramA: params.tokenProgramA || TOKEN_PROGRAM_ID,
      tokenProgramB: params.tokenProgramB || TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  return ix as TransactionInstruction;
};

export const buy = async (params: BuyParams): Promise<string> => {
  const ix = await buyInstruction(params);
  const tx = new anchor.web3.Transaction().add(ix);
  return params.program.provider.sendAndConfirm(tx, params.signers || []);
};
