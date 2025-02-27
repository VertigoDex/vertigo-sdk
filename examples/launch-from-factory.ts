import { VertigoSDK } from "@vertigoamm/vertigo-sdk";
import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
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

// Token parameters for the new token
const tokenParams = {
  /**
   * Name of the token
   */
  name: "Test Token",
  /**
   * Symbol of the token
   */
  symbol: "TEST",
  /**
   * URI of the token metadata
   */
  uri: "https://test.com/metadata.json",
  /**
   * Number of fee-free buys allowed
   * Setting to 1 since so the dev buy is not subject to fees in this example
   */
  feeFreebuys: 1,
};

// Generate keypairs for the token
// Note: When launching from a factory, you need to own both:
// 1. The mint keypair
// 2. The mint authority keypair
const mint = Keypair.generate();
const mintAuthority = Keypair.generate(); // Must be owned by you
const royaltiesOwner = Keypair.generate(); // Will receive royalties from trades
const dev = Keypair.generate(); // Optional: Developer who gets initial tokens

// Dev is buying 1 SOL worth of tokens
const devBuyAmount = new anchor.BN(LAMPORTS_PER_SOL);

// Launch the pool from the factory
const { signature, mintAddress, poolAddress, vaultAddress } =
  await vertigo.launchFromFactory(
    wallet, // Payer for transaction
    wallet, // Factory owner
    mint,
    mintAuthority,
    royaltiesOwner.publicKey,
    tokenParams,
    devBuyAmount, // Optional: Amount of SOL for initial dev buy
    dev // Optional: Developer receiving initial tokens
  );

console.log(`Pool launched at ${poolAddress.toString()}`);
console.log(`Mint address: ${mintAddress.toString()}`);
console.log(`Vault address: ${vaultAddress.toString()}`);
console.log(`Transaction signature: ${signature}`);
