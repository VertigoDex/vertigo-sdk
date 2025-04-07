import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import {
  getAssociatedTokenAddressSync,
  NATIVE_MINT,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { getRpcUrl } from "../utils";
import fs from "node:fs";
import { VertigoSDK } from "../../src";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const DECIMALS = 6;

const argv = yargs(hideBin(process.argv))
  .option("network", {
    type: "string",
    description: "Solana network to use",
    default: "localnet",
  })
  .option("pool-owner", {
    type: "string",
    description: "Pool owner address",
    demandOption: true,
  })
  .option("path-to-user", {
    type: "string",
    description: "Path to user keypair file",
    default: `${process.env.HOME}/.config/solana/id.json`,
  })
  .option("mint-a", {
    type: "string",
    description: "Mint A address",
    default: NATIVE_MINT.toString(),
  })
  .option("mint-b", {
    type: "string",
    description: "Mint B address",
    demandOption: true,
  })
  .option("token-program-a", {
    type: "string",
    description: "Token program A address",
    default: TOKEN_PROGRAM_ID.toString(),
  })
  .option("token-program-b", {
    type: "string",
    description: "Token program B address",
    default: TOKEN_2022_PROGRAM_ID.toString(),
  })
  .option("amount", {
    type: "number",
    description: "Amount of tokens to sell",
    demandOption: true,
  })
  .option("limit", {
    type: "number",
    description: "Limit for the sell order",
    default: 0,
  })
  .parseSync();

async function main() {
  // Connect to Solana
  const connection = new Connection(getRpcUrl(argv.network), "confirmed");

  // Load wallet from path
  const wallet = new anchor.Wallet(
    Keypair.fromSecretKey(
      Buffer.from(JSON.parse(fs.readFileSync(argv["path-to-user"], "utf-8")))
    )
  );

  // Load user from path
  const user = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(argv["path-to-user"], "utf-8")))
  );

  const vertigo = new VertigoSDK(connection, wallet);

  const userTaA = await getAssociatedTokenAddressSync(
    new PublicKey(argv["mint-a"]),
    user.publicKey,
    false,
    new PublicKey(argv["token-program-a"])
  );
  const userTaB = await getAssociatedTokenAddressSync(
    new PublicKey(argv["mint-b"]),
    user.publicKey,
    false,
    new PublicKey(argv["token-program-b"])
  );

  console.log("User token account A: ", userTaA.toString());
  console.log("User token account B: ", userTaB.toString());

  await vertigo.sell({
    owner: new PublicKey(argv["pool-owner"]),
    user,
    mintA: new PublicKey(argv["mint-a"]),
    mintB: new PublicKey(argv["mint-b"]),
    userTaA,
    userTaB,
    tokenProgramA: new PublicKey(argv["token-program-a"]),
    tokenProgramB: new PublicKey(argv["token-program-b"]),
    params: {
      amount: new anchor.BN(argv.amount).muln(10 ** DECIMALS),
      limit: new anchor.BN(argv.limit),
    },
  });
}

main();
