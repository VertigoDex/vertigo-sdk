import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import type { Amm } from "../../target/types/amm";
import { CreateParams } from "../helpers/create";

export type CreateParamsOptions = {
  program: anchor.Program<Amm>;
  connection: Connection;
  payer: PublicKey;
  owner?: Keypair;
  tokenWalletAuthority?: Keypair;
  mintA: PublicKey;
  mintB: PublicKey;
  initialMarketCap: number | anchor.BN;
  initialTokenBReserves: number | anchor.BN;
  royaltiesBps: number;
  launchTime?: number | anchor.BN;
  privilegedSwapper?: PublicKey;
  priorityFee?: number;
  computeUnits?: number;
};

export const buildCreateParams = (
  options: CreateParamsOptions,
): CreateParams => {
  const initialMarketCap =
    typeof options.initialMarketCap === "number"
      ? new anchor.BN(options.initialMarketCap)
      : options.initialMarketCap;

  const initialTokenBReserves =
    typeof options.initialTokenBReserves === "number"
      ? new anchor.BN(options.initialTokenBReserves)
      : options.initialTokenBReserves;

  const launchTime = options.launchTime
    ? typeof options.launchTime === "number"
      ? new anchor.BN(options.launchTime)
      : options.launchTime
    : undefined;

  if (options.royaltiesBps < 0 || options.royaltiesBps > 10000) {
    throw new Error(
      `Invalid royaltiesBps: ${options.royaltiesBps} (must be between 0 and 10000)`,
    );
  }

  return {
    program: options.program,
    connection: options.connection,
    payer: options.payer,
    owner: options.owner || Keypair.generate(),
    tokenWalletAuthority: options.tokenWalletAuthority || Keypair.generate(),
    mintA: options.mintA,
    mintB: options.mintB,
    initialMarketCap,
    initialTokenBReserves,
    royaltiesBps: options.royaltiesBps,
    launchTime,
    privilegedSwapper: options.privilegedSwapper,
    priorityFee: options.priorityFee,
    computeUnits: options.computeUnits,
  };
};
