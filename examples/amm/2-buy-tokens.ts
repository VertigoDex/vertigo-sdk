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
      Buffer.from(JSON.parse(fs.readFileSync(argv["path-to-user"], "utf-8")))
    )
  );

  // Load owner from path
  const owner = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(argv["path-to-user"], "utf-8")))
  );

  // Load user from path
  const user = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(argv["path-to-user"], "utf-8")))
  );
  const provider = new anchor.AnchorProvider(connection, wallet);

  const vertigo = new VertigoSDK(provider);

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
      }
    }
  } else {
    // check taA balance
    const taABalance = await connection.getTokenAccountBalance(userTaA);
    console.log(
      `User TA A balance: ${new anchor.BN(taABalance.value.amount).toNumber()}`
    );
  }

  const userTaB = await getAssociatedTokenAddressSync(
    new PublicKey(argv["mint-b"]),
    user.publicKey,
    false,
    new PublicKey(argv["token-program-b"])
  );

  const signature = await vertigo.buy({
    owner: new PublicKey(argv["pool-owner"]),
    user,
    mintA: NATIVE_MINT,
    mintB: new PublicKey(argv["mint-b"]),
    userTaA,
    userTaB,
    tokenProgramA: new PublicKey(argv["token-program-a"]),
    tokenProgramB: new PublicKey(argv["token-program-b"]),
    params: {
      amount: new anchor.BN(Number(argv.amount)),
      limit: new anchor.BN(argv.limit),
    },
  });

  console.log(`Buy transaction signature: ${signature}`);
}

main();
