import { VertigoSDK } from "@vertigo-amm/vertigo-sdk";
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

const DECIMALS = 6;

const FACTORY_PARAMS = {
  shift: new anchor.BN(LAMPORTS_PER_SOL).muln(100), // 100 virtual SOL
  initialTokenBReserves: new anchor.BN(1_000_000_000).muln(10 ** DECIMALS),
  feeParams: {
    normalizationPeriod: new anchor.BN(100),
    decay: 10,
    royaltiesBps: 100, // 1%
  },
  tokenParams: {
    decimals: DECIMALS,
    mutable: true,
  },
};

// create factory
// The factory acts as a launchpad for creating new pools. Once deployed,
// you can use it to launch as many pools as you want. Think of it as your
// personal pool factory - you own it and control it.
const signature = await vertigo.createFactory(
  /* wallet paying for the transaction */
  wallet,
  /* wallet that will own the factory */
  wallet,
  /* factory parameters */
  FACTORY_PARAMS
);

console.log(`Factory created with signature: ${signature}`);
