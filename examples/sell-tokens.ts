import { VertigoSDK } from "@vertigoamm/vertigo-sdk";
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

// sell 100,000 tokens
const tokensToSell = new anchor.BN(100_000);
// convert to lamports, assuming mint has 6 decimals
const lamportsToSell = tokensToSell.muln(10 ** 6);

// execute sell transaction
// the pool address is derived from the mint address
const tx = await vertigo.sell(wallet, wallet, mintAddress, lamportsToSell, 0.2);

console.log(`🔗 Sell transaction: ${tx}`);
