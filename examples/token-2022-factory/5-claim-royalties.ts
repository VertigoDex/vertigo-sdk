import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import {
  TOKEN_PROGRAM_ID,
  NATIVE_MINT,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import fs from "node:fs";
import { getRpcUrl, VertigoSDK } from "../../src";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const argv = yargs(hideBin(process.argv))
  .option("network", {
    type: "string",
    description: "Solana network to use",
    default: "localnet",
  })
  .option("path-to-claimer", {
    type: "string",
    description: "Path to claimer keypair file",
    default: `${process.env.HOME}/.config/solana/id.json`,
  })
  .option("pool", {
    type: "string",
    description: "Pool address",
    demandOption: true,
  })
  .option("mint-a", {
    type: "string",
    description: "Mint A address (defaults to native SOL mint)",
    default: NATIVE_MINT.toString(),
  })
  .option("receiver-mint-a-token-account", {
    type: "string",
    description:
      "Receiver mint A token account address (defaults to claimer's associated token account)",
  })
  .parseSync();

async function main() {
  // Connect to Solana
  const connection = new Connection(getRpcUrl(argv.network), "confirmed");

  // Load wallet from path
  const wallet = new anchor.Wallet(
    Keypair.fromSecretKey(
      Buffer.from(JSON.parse(fs.readFileSync(argv["path-to-claimer"], "utf-8")))
    )
  );

  // Load claimer - either from provided address or default to owner
  const claimer = argv.claimer
    ? Keypair.fromSecretKey(
        Buffer.from(
          JSON.parse(fs.readFileSync(argv["path-to-claimer"], "utf-8"))
        )
      )
    : wallet.payer;

  const mintA = new PublicKey(argv["mint-a"]);

  // Get receiver token account - either provided or default to claimer's ATA
  const receiverTokenAccount = argv["receiver-mint-a-token-account"]
    ? new PublicKey(argv["receiver-mint-a-token-account"])
    : getAssociatedTokenAddressSync(
        mintA,
        claimer.publicKey,
        false,
        TOKEN_PROGRAM_ID
      );

  // Check if receiver token account exists
  try {
    await connection.getTokenAccountBalance(receiverTokenAccount);
  } catch (error) {
    throw new Error(
      `Receiver token account (${receiverTokenAccount.toString()}) does not exist`
    );
  }

  const provider = new anchor.AnchorProvider(connection, wallet);
  const vertigo = new VertigoSDK(provider);

  const signature = await vertigo.claimRoyalties({
    pool: new PublicKey(argv.pool),
    claimer,
    mintA: NATIVE_MINT,
    receiverTaA: receiverTokenAccount,
    tokenProgramA: TOKEN_PROGRAM_ID,
  });

  console.log(`Claim royalties transaction signature: ${signature}`);
}

main();
