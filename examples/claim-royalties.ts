import { VertigoSDK } from "@vertigo-amm/vertigo-sdk";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";

// imports to load from local file
import fs from "node:fs";
import os from "node:os";

// init vertigo sdk
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

const pathToWallet = `${os.homedir()}/.config/solana/id.json`;
// Load a wallet from a local file
const walletKeypair = Keypair.fromSecretKey(
  Buffer.from(JSON.parse(fs.readFileSync(pathToWallet, "utf-8")))
);
const wallet = new anchor.Wallet(walletKeypair);

const vertigo = new VertigoSDK({
  connection,
  wallet,
});

// mint address
const mintAddress = new PublicKey("<MINT_ADDRESS>");

// optional: royalties receiver address
// defaults to royaltiesOwner if not provided
const royaltiesReceiver = new PublicKey("<ROYALTIES_RECEIVER_ADDRESS>");

// execute claim royalties transaction
const signature = await vertigo.claimRoyalties(
  mintAddress,
  /* wallet paying for the transaction */
  wallet,
  /* wallet that has authority over the royalties, in this example the deployer */
  wallet,
  /* Optional receiver of the royalties, defaults to royaltiesOwner if not provided */
  royaltiesReceiver
);

console.log(`🔗 Claim royalties transaction: ${signature}`);
