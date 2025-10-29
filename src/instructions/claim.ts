import * as anchor from "@coral-xyz/anchor";
import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";
import type { Amm } from "../../target/types/amm";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

export type ClaimInstructionParams = {
  program: anchor.Program<Amm>;
  pool: PublicKey;
  claimer: PublicKey;
  mintA: PublicKey;
  vaultA: PublicKey;
  receiverTaA: PublicKey;
  tokenProgramA?: PublicKey;
};

export type ClaimParams = ClaimInstructionParams & {
  signers?: anchor.web3.Signer[];
};

export const claimInstruction = async (
  params: ClaimInstructionParams,
): Promise<TransactionInstruction> => {
  return params.program.methods
    .claim()
    .accounts({
      pool: params.pool,
      claimer: params.claimer,
      mintA: params.mintA,
      vaultA: params.vaultA,
      receiverTaA: params.receiverTaA,
      tokenProgramA: params.tokenProgramA || TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
};

export const claim = async (params: ClaimParams): Promise<string> => {
  const ix = await claimInstruction(params);
  const tx = new anchor.web3.Transaction().add(ix);
  return params.program.provider.sendAndConfirm(tx, params.signers || []);
};
