import * as anchor from "@coral-xyz/anchor";
import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import type { Amm } from "../../target/types/amm";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

export type CreateInstructionParams = {
  program: anchor.Program<Amm>;
  payer: PublicKey;
  owner: PublicKey;
  tokenWalletAuthority: PublicKey;
  mintA: PublicKey;
  mintB: PublicKey;
  tokenWalletB: PublicKey;
  pool: PublicKey;
  vaultA: PublicKey;
  vaultB: PublicKey;
  shift: anchor.BN;
  initialTokenBReserves: anchor.BN;
  feeParams: {
    normalizationPeriod: anchor.BN;
    decay: number;
    royaltiesBps: number;
    privilegedSwapper?: PublicKey;
    reference: anchor.BN;
  };
  tokenProgramA?: PublicKey;
  tokenProgramB?: PublicKey;
};

export type CreateParams = CreateInstructionParams & {
  signers?: anchor.web3.Signer[];
};

export const createInstruction = async (
  params: CreateInstructionParams,
): Promise<TransactionInstruction> => {
  return params.program.methods
    .create({
      shift: params.shift,
      initialTokenBReserves: params.initialTokenBReserves,
      feeParams: params.feeParams,
    })
    .accounts({
      payer: params.payer,
      owner: params.owner,
      tokenWalletAuthority: params.tokenWalletAuthority,
      mintA: params.mintA,
      mintB: params.mintB,
      tokenWalletB: params.tokenWalletB,
      pool: params.pool,
      vaultA: params.vaultA,
      vaultB: params.vaultB,
      tokenProgramA: params.tokenProgramA || TOKEN_PROGRAM_ID,
      tokenProgramB: params.tokenProgramB || TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .instruction();
};

export const create = async (params: CreateParams): Promise<string> => {
  const ix = await createInstruction(params);
  const tx = new anchor.web3.Transaction().add(ix);
  return params.program.provider.sendAndConfirm(tx, params.signers || []);
};
