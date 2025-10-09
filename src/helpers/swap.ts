import * as anchor from "@coral-xyz/anchor";
import {
  Connection,
  PublicKey,
  Transaction,
  Keypair,
  SystemProgram,
} from "@solana/web3.js";
import type { Amm } from "../../target/types/amm";
import { buyInstruction, sellInstruction } from "../instructions";
import { quote, QuoteResult } from "./quote";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  TOKEN_PROGRAM_ID,
  NATIVE_MINT,
  createSyncNativeInstruction,
  createCloseAccountInstruction,
} from "@solana/spl-token";

export type SwapParams = {
  program: anchor.Program<Amm>;
  connection: Connection;
  pool: PublicKey;
  inputMint: PublicKey;
  outputMint: PublicKey;
  amount: anchor.BN;
  user: PublicKey;
  slippageBps?: number;
  wrapSol?: boolean;
  unwrapSol?: boolean;
  priorityFee?: number;
  computeUnits?: number;
  quote?: QuoteResult;
};

export type SwapResult = {
  signature: string;
  inputAmount: anchor.BN;
  outputAmount: anchor.BN;
};

const getPoolData = async (
  program: anchor.Program<Amm>,
  poolAddress: PublicKey
) => {
  const accountInfo = await program.provider.connection.getAccountInfo(
    poolAddress
  );
  if (!accountInfo) {
    throw new Error("Pool not found");
  }

  const poolAccount = program.coder.accounts.decode("pool", accountInfo.data);

  return {
    owner: poolAccount.owner as PublicKey,
    mintA: poolAccount.mintA as PublicKey,
    mintB: poolAccount.mintB as PublicKey,
  };
};

const getTokenProgram = async (
  connection: Connection,
  mint: PublicKey
): Promise<PublicKey> => {
  const mintInfo = await connection.getAccountInfo(mint);
  return mintInfo?.owner || TOKEN_PROGRAM_ID;
};

export const swap = async (params: SwapParams): Promise<SwapResult> => {
  const quoteResult =
    params.quote ||
    (await quote({
      program: params.program,
      connection: params.connection,
      pool: params.pool,
      inputMint: params.inputMint,
      outputMint: params.outputMint,
      amount: params.amount,
      slippageBps: params.slippageBps,
    }));

  const pool = await getPoolData(params.program, params.pool);
  const instructions = [];

  if (params.priorityFee) {
    instructions.push(
      anchor.web3.ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: params.priorityFee,
      })
    );
  }

  if (params.computeUnits) {
    instructions.push(
      anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
        units: params.computeUnits,
      })
    );
  }

  let wrapKeypair: Keypair | undefined;
  if (params.wrapSol && params.inputMint.equals(NATIVE_MINT)) {
    wrapKeypair = Keypair.generate();
    instructions.push(
      SystemProgram.createAccount({
        fromPubkey: params.user,
        newAccountPubkey: wrapKeypair.publicKey,
        lamports: params.amount.toNumber(),
        space: 165,
        programId: TOKEN_PROGRAM_ID,
      }),
      createSyncNativeInstruction(wrapKeypair.publicKey, TOKEN_PROGRAM_ID)
    );
  }

  const [tokenProgramA, tokenProgramB] = await Promise.all([
    getTokenProgram(params.connection, pool.mintA),
    getTokenProgram(params.connection, pool.mintB),
  ]);

  const inputAta = getAssociatedTokenAddressSync(
    params.inputMint,
    params.user,
    false,
    TOKEN_PROGRAM_ID
  );

  const outputAta = getAssociatedTokenAddressSync(
    params.outputMint,
    params.user,
    false,
    TOKEN_PROGRAM_ID
  );

  instructions.push(
    createAssociatedTokenAccountIdempotentInstruction(
      params.user,
      outputAta,
      params.user,
      params.outputMint,
      TOKEN_PROGRAM_ID
    )
  );

  const [vaultA] = PublicKey.findProgramAddressSync(
    [params.pool.toBuffer(), pool.mintA.toBuffer()],
    params.program.programId
  );

  const [vaultB] = PublicKey.findProgramAddressSync(
    [params.pool.toBuffer(), pool.mintB.toBuffer()],
    params.program.programId
  );

  if (quoteResult.isBuy) {
    const ix = await buyInstruction({
      program: params.program,
      pool: params.pool,
      user: params.user,
      owner: pool.owner,
      mintA: pool.mintA,
      mintB: pool.mintB,
      userTaA: inputAta,
      userTaB: outputAta,
      vaultA,
      vaultB,
      amount: quoteResult.inputAmount,
      limit: quoteResult.minimumReceived,
      tokenProgramA,
      tokenProgramB,
    });
    instructions.push(ix);
  } else {
    const ix = await sellInstruction({
      program: params.program,
      pool: params.pool,
      user: params.user,
      owner: pool.owner,
      mintA: pool.mintA,
      mintB: pool.mintB,
      userTaA: inputAta,
      userTaB: outputAta,
      vaultA,
      vaultB,
      amount: quoteResult.inputAmount,
      limit: quoteResult.minimumReceived,
      tokenProgramA,
      tokenProgramB,
    });
    instructions.push(ix);
  }

  if (params.unwrapSol && params.outputMint.equals(NATIVE_MINT)) {
    instructions.push(
      createCloseAccountInstruction(
        outputAta,
        params.user,
        params.user,
        [],
        TOKEN_PROGRAM_ID
      )
    );
  }

  const tx = new Transaction().add(...instructions);
  const signers = wrapKeypair ? [wrapKeypair] : [];

  const signature = await params.program.provider.sendAndConfirm(tx, signers);

  return {
    signature,
    inputAmount: quoteResult.inputAmount,
    outputAmount: quoteResult.outputAmount,
  };
};
