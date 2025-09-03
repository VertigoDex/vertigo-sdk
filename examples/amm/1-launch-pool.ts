import { VertigoSDK } from "../../src/sdk";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { NATIVE_MINT, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import fs from "node:fs";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { getRpcUrl, validateLaunchParams } from "../../src/utils/helpers";
import { CreateRequest } from "../../src/types/generated/amm";
import { DevBuyArgs } from "../../src";
import { parseJsonOrThrow } from "../utils";

const argv = yargs(hideBin(process.argv))
  .option("network", {
    type: "string",
    description: "Solana network to use",
    default: "localnet",
  })
  .option("path-to-payer", {
    type: "string",
    description: "Path to payer keypair file",
    default: `${process.env.HOME}/.config/solana/id.json`,
  })
  .option("path-to-owner", {
    type: "string",
    description: "Path to owner keypair file",
    default: `${process.env.HOME}/.config/solana/id.json`,
  })
  .option("path-to-user", {
    type: "string",
    description: "Path to user keypair file",
    default: `${process.env.HOME}/.config/solana/id.json`,
  })
  .option("path-to-token-wallet-authority", {
    type: "string",
    description: "Path to token wallet authority keypair file",
    demandOption: true,
  })
  .option("token-wallet-address", {
    type: "string",
    description: "Token wallet address",
    demandOption: true,
  })
  .option("mint-a", {
    type: "string",
    description: "Native mint address",
    default: NATIVE_MINT,
  })
  .option("mint-b", {
    type: "string",
    description: "Custom token mint address",
    demandOption: true,
  })
  .option("token-program-a", {
    type: "string",
    description: "Token program address",
    default: TOKEN_PROGRAM_ID,
  })
  .option("token-program-b", {
    type: "string",
    description: "Token program address",
    default: TOKEN_PROGRAM_ID,
  })
  .option("devTaA", {
    type: "string",
    description: "Dev SOL token account address",
    optional: true,
  })
  .option("devTaB", {
    type: "string",
    description: "Dev custom token account address",
    optional: true,
  })
  .option("devBuyAmount", {
    type: "number",
    description: "Amount of Mint A to spend in the dev buy",
    optional: true,
  })
  .option("devBuyLimit", {
    type: "number",
    description: "Limit for the dev buy order",
    optional: true,
  })
  .option("path-to-pool-params", {
    type: "string",
    description: "Path to pool params JSON file",
    demandOption: true,
  })
  .parseSync();

async function main() {
  // Connect to Solana
  const connection = new Connection(getRpcUrl(argv.network), "confirmed");

  // Load wallet from path
  const wallet = new anchor.Wallet(
    Keypair.fromSecretKey(
      Buffer.from(JSON.parse(fs.readFileSync(argv["path-to-payer"], "utf-8"))),
    ),
  );
  const provider = new anchor.AnchorProvider(connection, wallet);

  const vertigo = new VertigoSDK(provider);

  // Load owner from path
  const owner = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(argv["path-to-owner"], "utf-8"))),
  );

  // Load user from path
  const user = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(argv["path-to-user"], "utf-8"))),
  );

  // Load token wallet authority from path
  const tokenWalletAuthority = Keypair.fromSecretKey(
    Buffer.from(
      JSON.parse(
        fs.readFileSync(argv["path-to-token-wallet-authority"], "utf-8"),
      ),
    ),
  );

  // Read and parse pool params
  const rawPoolParams = parseJsonOrThrow(argv["path-to-pool-params"]);

  // Convert raw values to proper types
  const poolParams = {
    shift: new anchor.BN(rawPoolParams.shift),
    initialTokenBReserves: new anchor.BN(rawPoolParams.initialTokenBReserves),
    feeParams: {
      normalizationPeriod: new anchor.BN(
        rawPoolParams.feeParams.normalizationPeriod,
      ),
      decay: rawPoolParams.feeParams.decay,
      royaltiesBps: rawPoolParams.feeParams.royaltiesBps,
      privilegedSwapper: rawPoolParams.feeParams.privilegedSwapper
        ? new PublicKey(rawPoolParams.feeParams.privilegedSwapper)
        : undefined,
      reference: rawPoolParams.feeParams.reference
        ? new anchor.BN(rawPoolParams.feeParams.reference)
        : undefined,
    },
  };

  // Validate the converted params
  validateLaunchParams(poolParams);

  const launchArgs: CreateRequest & Partial<DevBuyArgs> = {
    params: poolParams,
    payer: wallet.payer,
    owner,
    tokenWalletAuthority,
    tokenWalletB: new PublicKey(argv["token-wallet-address"]),
    mintA: new PublicKey(argv["mint-a"]),
    mintB: new PublicKey(argv["mint-b"]),
    tokenProgramA: new PublicKey(argv["token-program-a"]),
    tokenProgramB: new PublicKey(argv["token-program-b"]),
  };

  if (argv.dev && argv.devTaA && argv.devTaB && argv.devBuyAmount) {
    launchArgs.amount = new anchor.BN(argv.devBuyAmount);
    launchArgs.limit = new anchor.BN(argv.devBuyAmount);
    launchArgs.devTaA = new PublicKey(argv.devTaA);
    launchArgs.dev = user;
  }

  const { deploySignature, poolAddress } = await vertigo.launchPool(launchArgs);

  console.log(`Transaction signature: ${deploySignature}`);
  console.log(`Pool address: ${poolAddress}`);
}
main();
