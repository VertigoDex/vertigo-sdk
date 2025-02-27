import { VertigoSDK } from "@vertigoamm/vertigo-sdk";
import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { createMint } from "@solana/spl-token";

// imports to load from local file
import fs from "node:fs";
import os from "node:os";
import type { PoolConfig } from "../src/types/pool";

// Connect to Solana
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

const pathToWallet = `${os.homedir()}/.config/solana/id.json`;
// Load a wallet from a local file
const walletKeypair = Keypair.fromSecretKey(
  Buffer.from(JSON.parse(fs.readFileSync(pathToWallet, "utf-8")))
);
const wallet = new anchor.Wallet(walletKeypair);

// Initialize Vertigo SDK
const vertigo = new VertigoSDK({
  connection,
  wallet,
});

// Number of decimal places for the token mint
const DECIMALS = 6;

// Pool configuration parameters
const POOL_PARAMS: PoolConfig = {
  // Virtual SOL shift that determines the pool's price curve
  // Higher values create a flatter curve with less price impact
  shift: new anchor.BN(LAMPORTS_PER_SOL).muln(100), // 100 virtual SOL

  // Initial token supply to seed the pool with
  // 1 billion tokens with 6 decimal places
  initialTokenBReserves: new anchor.BN(1_000_000_000).muln(10 ** DECIMALS),

  // Fee parameters that control trading costs and royalty distribution
  feeParams: {
    // Time period (in slots) over which fees are normalized
    normalizationPeriod: new anchor.BN(100),

    // Rate at which fees decay back to base level (1-100)
    decay: 10,

    // Percentage of trading fees paid as royalties (in basis points)
    royaltiesBps: 100, // 1%

    // Number of initial buys that are exempt from fees
    // If setting devBuyAmount, set this to 1 so the dev tokens are not subject to fees
    feeExemptBuys: 0,

    // Usually set to 0, but can be set to a specific slot if needed
    reference: new anchor.BN(0),
  },
};

// Create mint
const tokenWalletAuthority = Keypair.generate();
const mintAuthority = Keypair.generate();
const dev = Keypair.generate();

const mint = await createMint(
  connection,
  wallet.payer,
  mintAuthority.publicKey,
  null,
  6
);
console.log(`Mint created at ${mint.toString()}`);

const { signature, poolAddress, mintAddress, vaultAddress } =
  await vertigo.launchPool(
    POOL_PARAMS,
    wallet.payer,
    wallet.payer,
    tokenWalletAuthority,
    dev.publicKey,
    mint,
    new anchor.BN(LAMPORTS_PER_SOL).muln(1),
    dev
  );

console.log(`Pool launched at ${poolAddress.toString()}`);
console.log(`Mint address: ${mintAddress.toString()}`);
console.log(`Vault address: ${vaultAddress.toString()}`);
console.log(`Transaction signature: ${signature}`);
