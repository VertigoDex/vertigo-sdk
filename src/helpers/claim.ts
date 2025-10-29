import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import type { Amm } from "../../target/types/amm";
import { claimInstruction } from "../instructions";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

export type ClaimParams = {
  program: anchor.Program<Amm>;
  connection: Connection;
  pool: PublicKey;
  claimer: PublicKey;
  destinationAccount?: PublicKey;
  priorityFee?: number;
  computeUnits?: number;
};

export type ClaimResult = {
  signature: string;
};

const getPoolData = async (
  program: anchor.Program<Amm>,
  poolAddress: PublicKey,
) => {
  const accountInfo =
    await program.provider.connection.getAccountInfo(poolAddress);
  if (!accountInfo) {
    throw new Error("Pool not found");
  }

  const poolAccount = program.coder.accounts.decode("pool", accountInfo.data);

  return {
    mintA: poolAccount.mintA as PublicKey,
  };
};

const getTokenProgram = async (
  connection: Connection,
  mint: PublicKey,
): Promise<PublicKey> => {
  const mintInfo = await connection.getAccountInfo(mint);
  return mintInfo?.owner || TOKEN_PROGRAM_ID;
};

export const claim = async (params: ClaimParams): Promise<ClaimResult> => {
  const pool = await getPoolData(params.program, params.pool);
  const instructions = [];

  if (params.priorityFee) {
    instructions.push(
      anchor.web3.ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: params.priorityFee,
      }),
    );
  }

  if (params.computeUnits) {
    instructions.push(
      anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
        units: params.computeUnits,
      }),
    );
  }

  const tokenProgramA = await getTokenProgram(params.connection, pool.mintA);

  const receiverTaA =
    params.destinationAccount ||
    getAssociatedTokenAddressSync(
      pool.mintA,
      params.claimer,
      false,
      tokenProgramA,
    );

  if (!params.destinationAccount) {
    instructions.push(
      createAssociatedTokenAccountIdempotentInstruction(
        params.claimer,
        receiverTaA,
        params.claimer,
        pool.mintA,
        tokenProgramA,
      ),
    );
  }

  const [vaultA] = PublicKey.findProgramAddressSync(
    [params.pool.toBuffer(), pool.mintA.toBuffer()],
    params.program.programId,
  );

  const ix = await claimInstruction({
    program: params.program,
    pool: params.pool,
    claimer: params.claimer,
    mintA: pool.mintA,
    vaultA,
    receiverTaA,
    tokenProgramA,
  });

  instructions.push(ix);

  const tx = new Transaction().add(...instructions);
  const signature = await params.program.provider.sendAndConfirm(tx, []);

  return {
    signature,
  };
};
