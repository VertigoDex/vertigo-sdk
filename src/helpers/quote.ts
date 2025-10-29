import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import type { Amm } from "../../target/types/amm";
import { quoteBuy, quoteSell } from "../instructions";
import { DEFAULT_SLIPPAGE_BPS, MAX_SLIPPAGE_BPS } from "../core/constants";

export type QuoteParams = {
  program: anchor.Program<Amm>;
  connection: Connection;
  pool: PublicKey;
  inputMint: PublicKey;
  outputMint: PublicKey;
  amount: anchor.BN;
  slippageBps?: number;
};

export type QuoteResult = {
  inputMint: PublicKey;
  outputMint: PublicKey;
  inputAmount: anchor.BN;
  outputAmount: anchor.BN;
  fee: anchor.BN;
  minimumReceived: anchor.BN;
  priceImpact: number;
  isBuy: boolean;
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
    owner: poolAccount.owner as PublicKey,
    mintA: poolAccount.mintA as PublicKey,
    mintB: poolAccount.mintB as PublicKey,
    reserveA: new anchor.BN(poolAccount.tokenAReserves.toString()),
    reserveB: new anchor.BN(poolAccount.tokenBReserves.toString()),
  };
};

const calculatePriceImpact = (
  inputAmount: anchor.BN,
  outputAmount: anchor.BN,
  reserveIn: anchor.BN,
  reserveOut: anchor.BN,
): number => {
  const spotPrice = reserveOut.mul(new anchor.BN(10000)).div(reserveIn);
  const executionPrice = outputAmount
    .mul(new anchor.BN(10000))
    .div(inputAmount);
  const impact = spotPrice
    .sub(executionPrice)
    .mul(new anchor.BN(10000))
    .div(spotPrice);
  return Math.abs(impact.toNumber()) / 100;
};

export const quote = async (params: QuoteParams): Promise<QuoteResult> => {
  const slippageBps = params.slippageBps ?? DEFAULT_SLIPPAGE_BPS;

  if (slippageBps > MAX_SLIPPAGE_BPS) {
    throw new Error(
      `Slippage too high: ${slippageBps} bps (max: ${MAX_SLIPPAGE_BPS})`,
    );
  }

  const pool = await getPoolData(params.program, params.pool);
  const user = params.program.provider.publicKey || PublicKey.default;

  const isBuy = pool.mintA.equals(params.inputMint);

  if (!isBuy && !pool.mintB.equals(params.inputMint)) {
    throw new Error(
      `Input mint ${params.inputMint.toBase58()} does not match pool mints`,
    );
  }

  const limit = params.amount.mul(new anchor.BN(2));

  let result;
  if (isBuy) {
    result = await quoteBuy({
      program: params.program,
      pool: params.pool,
      owner: pool.owner,
      user,
      mintA: pool.mintA,
      mintB: pool.mintB,
      amount: params.amount,
      limit,
    });
  } else {
    result = await quoteSell({
      program: params.program,
      pool: params.pool,
      owner: pool.owner,
      user,
      mintA: pool.mintA,
      mintB: pool.mintB,
      amount: params.amount,
      limit,
    });
  }

  const outputAmount = isBuy ? result.amountB : result.amountA;
  const fee = result.feeA;

  const slippageMultiplier = 10000 - slippageBps;
  const minimumReceived = outputAmount
    .mul(new anchor.BN(slippageMultiplier))
    .div(new anchor.BN(10000));

  const priceImpact = calculatePriceImpact(
    params.amount,
    outputAmount,
    isBuy ? pool.reserveA : pool.reserveB,
    isBuy ? pool.reserveB : pool.reserveA,
  );

  return {
    inputMint: params.inputMint,
    outputMint: params.outputMint,
    inputAmount: params.amount,
    outputAmount,
    fee,
    minimumReceived,
    priceImpact,
    isBuy,
  };
};
