import { VertigoSDK } from "@vertigo-amm/vertigo-sdk";
import { Connection, Keypair } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";

// imports to load from local file
import fs from "node:fs";
import os from "node:os";

// Connect to Solana
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

const pathToWallet = `${os.homedir()}/.config/solana/id.json`;
// Load a wallet from a local file
const walletKeypair = Keypair.fromSecretKey(
  Buffer.from(JSON.parse(fs.readFileSync(pathToWallet, "utf-8")))
);
const wallet = new anchor.Wallet(walletKeypair);

// Alternatively you could generate a new wallet, although it will
// need to be funded before you can perform transactions
// const wallet = new anchor.Wallet(Keypair.generate());

// Initialize Vertigo SDK
const vertigo = new VertigoSDK({
  connection,
  wallet,
});
