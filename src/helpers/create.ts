import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey, Transaction, Keypair } from "@solana/web3.js";
import type { Amm } from "../../target/types/amm";
import { createInstruction } from "../instructions";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

export type CreateParams = {
  program: anchor.Program<Amm>;
  connection: Connection;
  payer: PublicKey;
  owner: Keypair;
  tokenWalletAuthority: Keypair;
  mintA: PublicKey;
  mintB: PublicKey;
  initialMarketCap: anchor.BN;
  initialTokenBReserves: anchor.BN;
  royaltiesBps: number;
  launchTime?: anchor.BN;
  privilegedSwapper?: PublicKey;
  priorityFee?: number;
  computeUnits?: number;
};

export type CreateResult = {
  signature: string;
  poolAddress: PublicKey;
};

const getTokenProgram = async (
  connection: Connection,
  mint: PublicKey,
): Promise<PublicKey> => {
  const mintInfo = await connection.getAccountInfo(mint);
  return mintInfo?.owner || TOKEN_PROGRAM_ID;
};

export const create = async (params: CreateParams): Promise<CreateResult> => {
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

  const [tokenProgramA, tokenProgramB] = await Promise.all([
    getTokenProgram(params.connection, params.mintA),
    getTokenProgram(params.connection, params.mintB),
  ]);

  const tokenWalletB = getAssociatedTokenAddressSync(
    params.mintB,
    params.tokenWalletAuthority.publicKey,
    true,
    tokenProgramB,
  );

  instructions.push(
    createAssociatedTokenAccountIdempotentInstruction(
      params.payer,
      tokenWalletB,
      params.tokenWalletAuthority.publicKey,
      params.mintB,
      tokenProgramB,
    ),
  );

  const [pool] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("pool"),
      params.owner.publicKey.toBuffer(),
      params.mintA.toBuffer(),
      params.mintB.toBuffer(),
    ],
    params.program.programId,
  );

  const [vaultA] = PublicKey.findProgramAddressSync(
    [pool.toBuffer(), params.mintA.toBuffer()],
    params.program.programId,
  );

  const [vaultB] = PublicKey.findProgramAddressSync(
    [pool.toBuffer(), params.mintB.toBuffer()],
    params.program.programId,
  );

  const feeParams = {
    normalizationPeriod: new anchor.BN(3600),
    decay: 0.99,
    royaltiesBps: params.royaltiesBps,
    privilegedSwapper: params.privilegedSwapper,
    reference:
      params.launchTime || new anchor.BN(Math.floor(Date.now() / 1000)),
  };

  const ix = await createInstruction({
    program: params.program,
    payer: params.payer,
    owner: params.owner.publicKey,
    tokenWalletAuthority: params.tokenWalletAuthority.publicKey,
    mintA: params.mintA,
    mintB: params.mintB,
    tokenWalletB,
    pool,
    vaultA,
    vaultB,
    shift: params.initialMarketCap,
    initialTokenBReserves: params.initialTokenBReserves,
    feeParams,
    tokenProgramA,
    tokenProgramB,
  });

  instructions.push(ix);

  const tx = new Transaction().add(...instructions);
  const signature = await params.program.provider.sendAndConfirm(tx, [
    params.owner,
    params.tokenWalletAuthority,
  ]);

  return {
    signature,
    poolAddress: pool,
  };
};
