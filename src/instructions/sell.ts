import * as anchor from "@coral-xyz/anchor";
import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";
import type { Amm } from "../../target/types/amm";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

export type SellInstructionParams = {
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

export type SellParams = SellInstructionParams & {
  signers?: anchor.web3.Signer[];
};

export const sellInstruction = async (
  params: SellInstructionParams,
): Promise<TransactionInstruction> => {
  return params.program.methods
    .sell({
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
};

export const sell = async (params: SellParams): Promise<string> => {
  const ix = await sellInstruction(params);
  const tx = new anchor.web3.Transaction().add(ix);
  return params.program.provider.sendAndConfirm(tx, params.signers || []);
};
