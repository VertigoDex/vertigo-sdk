import { VertigoSDK } from "@vertigo-amm/vertigo-sdk";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";

// imports to load from local file
import fs from "node:fs";
import os from "node:os";

// init vertigo sdk
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

const pathToWallet = `${os.homedir()}/.config/solana/id.json`;

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

// buy 1 SOL worth of tokens
const amount = new anchor.BN(LAMPORTS_PER_SOL);

// execute buy transaction
// the pool address is derived from the mint address
const tx = await vertigo.buy(wallet, wallet, mintAddress, amount, 0.2);

console.log(`🔗 Buy transaction: ${tx}`);
