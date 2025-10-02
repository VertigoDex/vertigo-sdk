/**
 * Vertigo SDK - Launch Token with Pool
 *
 * This example shows how to launch a new token and create a pool
 *
 * NOTE: Token factory features are under development.
 * This is a placeholder example showing the intended API.
 */

import { Vertigo } from "../../src";
import { Connection, Keypair } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

async function main() {
  // Load wallet
  const walletPath = path.join(os.homedir(), ".config/solana/id.json");

  if (!fs.existsSync(walletPath)) {
    console.error(`❌ Wallet not found at ${walletPath}`);
    console.log("Please create a wallet using: solana-keygen new");
    process.exit(1);
  }

  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
  );

  const wallet = new anchor.Wallet(walletKeypair);

  // Initialize SDK
  const vertigo = await Vertigo.load({
    connection: new Connection("https://api.devnet.solana.com"),
    wallet,
    network: "devnet",
  });

  console.log("🚀 Launching new token with pool...");
  console.log("⚠️  Note: Token factory features are under development");

  // This is the intended API for launching tokens:
  /*
  const result = await vertigo.factory.launchTokenWithPool({
    metadata: {
      name: "My Awesome Token",
      symbol: "MAT",
      uri: "https://example.com/token-metadata.json",
      decimals: 9,
    },
    supply: 1_000_000_000_000_000, // 1 million tokens (with 9 decimals)
    initialMarketCap: 50_000_000_000, // 50 SOL initial market cap
    royaltiesBps: 250, // 2.5% royalties
    useToken2022: false, // Use regular SPL token
  });

  console.log("✅ Token and pool launched successfully!");
  console.log(`Transaction: ${result.signature}`);
  console.log(`Token Mint: ${result.mintAddress.toBase58()}`);
  console.log(`Pool Address: ${result.poolAddress.toBase58()}`);
  */

  console.log("\n📚 For now, use the legacy SDK for pool creation:");
  console.log("import { VertigoSDK } from '@vertigo-amm/vertigo-sdk';");
  console.log(
    "\nSee examples/amm/ directory for working examples using the legacy SDK."
  );
}

main().catch(console.error);
