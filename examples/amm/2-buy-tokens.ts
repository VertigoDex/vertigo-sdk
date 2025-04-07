import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import {
  createAssociatedTokenAccount,
  getAssociatedTokenAddressSync,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import fs from "node:fs";
import { getRpcUrl, VertigoSDK } from "../../src";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { wrapSol } from "../../../tests/utils";

const argv = yargs(hideBin(process.argv))
  .option("network", {
    type: "string",
    description: "Solana network to use",
    default: "localnet",
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
  .option("mint-a", {
    type: "string",
    description: "Native mint address",
    default: NATIVE_MINT.toString(),
  })
  .option("mint-b", {
    type: "string",
    description: "Custom token mint address",
    demandOption: true,
  })
  .option("token-program-a", {
    type: "string",
    description: "Token program address",
    default: TOKEN_PROGRAM_ID.toString(),
  })
  .option("token-program-b", {
    type: "string",
    description: "Token program address",
    default: TOKEN_PROGRAM_ID.toString(),
  })
  .option("amount", {
    type: "number",
    description: "Amount of SOL to spend",
    default: 1,
  })
  .option("limit", {
    type: "number",
    description: "Limit for the buy order",
    default: 0,
  })
  .parseSync();

async function main() {
  // Connect to Solana
  const connection = new Connection(getRpcUrl(argv.network), "confirmed");

  // Load wallet from path
  const wallet = new anchor.Wallet(
    Keypair.fromSecretKey(
      Buffer.from(JSON.parse(fs.readFileSync(argv["path-to-owner"], "utf-8")))
    )
  );

  // Load owner from path
  const owner = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(argv["path-to-owner"], "utf-8")))
  );

  // Load user from path
  const user = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(argv["path-to-user"], "utf-8")))
  );
  const provider = new anchor.AnchorProvider(connection, wallet);

  const vertigo = new VertigoSDK(connection, wallet);

  const userTaA = await getAssociatedTokenAddressSync(
    NATIVE_MINT,
    user.publicKey,
    false,
    new PublicKey(argv["token-program-a"])
  );

  // Fund some wSol for the user if Mint A is SOL
  if (argv["mint-a"] === NATIVE_MINT.toString()) {
    // Check if the user has a wSOL account
    // If not, create one
    let wSolBalance = 0;
    try {
      wSolBalance = await connection
        .getTokenAccountBalance(userTaA)
        .then((balance) => {
          return balance.value.uiAmount;
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
        await wrapSol(
          provider,
          difference * LAMPORTS_PER_SOL,
          user.publicKey,
          user,
          null
        );
      }
    }
  }

  const userTaB = await getAssociatedTokenAddressSync(
    new PublicKey(argv["mint-b"]),
    user.publicKey,
    false,
    new PublicKey(argv["token-program-b"])
  );

  const signature = await vertigo.buy({
    owner: owner.publicKey,
    user,
    mintA: NATIVE_MINT,
    mintB: new PublicKey(argv["mint-b"]),
    userTaA,
    userTaB,
    tokenProgramA: new PublicKey(argv["token-program-a"]),
    tokenProgramB: new PublicKey(argv["token-program-b"]),
    params: {
      amount: new anchor.BN(Number(argv.amount) * LAMPORTS_PER_SOL),
      limit: new anchor.BN(argv.limit),
    },
  });

  console.log(`Buy transaction signature: ${signature}`);
}

main();
