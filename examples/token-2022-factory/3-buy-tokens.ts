import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import {
  createAssociatedTokenAccount,
  getAssociatedTokenAddressSync,
  NATIVE_MINT,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";

import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import fs from "node:fs";
import { getRpcUrl, VertigoSDK } from "../../src";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { wrapSol } from "../utils";

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
    description: "Amount of mintA to spend",
    demandOption: true,
  })
  .option("limit", {
    type: "number",
    description: "Limit for the buy order",
    default: 0,
  })
  .parseSync();

async function main() {
  /*
  1. Initialize the SDK 
  */

  // Connect to Solana
  const connection = new Connection(getRpcUrl(argv.network), "confirmed");

  // Load wallet from path
  const wallet = new anchor.Wallet(
    Keypair.fromSecretKey(
      Buffer.from(JSON.parse(fs.readFileSync(argv["path-to-user"], "utf-8")))
    )
  );

  const provider = new anchor.AnchorProvider(connection, wallet);

  // Load user from path
  const user = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(argv["path-to-user"], "utf-8")))
  );

  const vertigo = new VertigoSDK(provider);

  const userTaA = getAssociatedTokenAddressSync(
    new PublicKey(argv["mint-a"]),
    user.publicKey,
    false,
    new PublicKey(argv["token-program-a"])
  );

  // Special wSOL quality of life stuff
  if (argv["mint-a"] === NATIVE_MINT.toString()) {
    // Check if the user has a wSOL account
    // If not, create one
    let wSolBalance = 0;
    try {
      wSolBalance = await connection
        .getTokenAccountBalance(userTaA)
        .then((balance) => {
          return new anchor.BN(balance.value.amount).toNumber();
        });
    } catch (error) {
      await createAssociatedTokenAccount(
        connection,
        user,
        new PublicKey(argv["mint-a"]),
        user.publicKey,
        { commitment: "confirmed" },
        new PublicKey(argv["token-program-a"])
      );
    }

    const amount = argv.amount;
    const balance = await connection.getBalance(user.publicKey);
    console.log(`User SOL balance: ${balance}`);
    console.log(`User wSOL balance: ${wSolBalance}`);

    // Check if the user has enough wSOL to cover the cost
    if (amount > wSolBalance) {
      console.log(`User has ${wSolBalance} wSOL, need ${amount} wSOL`);
      // If not, Check if we have enough SOL to make up for the difference
      if (balance + wSolBalance < amount) {
        throw new Error(
          `Not enough SOL in wallet. Balance: ${balance}, required: ${amount}`
        );
      }
      const difference = amount - wSolBalance;
      if (difference > 0) {
        console.log(`Wrapping ${difference} SOL to wSOL...`);
        await wrapSol(provider, difference, user.publicKey, user, null);
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds
      }
    }
  }

  // check TaA balance
  const taABalance = await connection.getTokenAccountBalance(userTaA);
  if (new anchor.BN(taABalance.value.amount).toNumber() === 0) {
    throw new Error(
      `User TaA (${userTaA.toString()}) does not exist or has no balance. Please create a TaA for the user.`
    );
  }

  const userTaB = getAssociatedTokenAddressSync(
    new PublicKey(argv["mint-b"]),
    user.publicKey,
    false,
    new PublicKey(argv["token-program-b"])
  );

  // Check if user token accounts exist
  try {
    await connection.getTokenAccountBalance(userTaA);
  } catch (error) {
    throw new Error(
      `User token account A (${userTaA.toString()}) does not exist`
    );
  }

  await vertigo.buy({
    owner: new PublicKey(argv["pool-owner"]),
    user,
    mintA: new PublicKey(argv["mint-a"]),
    mintB: new PublicKey(argv["mint-b"]),
    userTaA,
    userTaB,
    tokenProgramA: new PublicKey(argv["token-program-a"]),
    tokenProgramB: new PublicKey(argv["token-program-b"]),
    params: {
      amount: new anchor.BN(argv.amount),
      limit: new anchor.BN(argv.limit),
    },
  });
}

main();
