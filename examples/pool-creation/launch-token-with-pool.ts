/**
 * Vertigo SDK - Launch Token with Pool
 * 
 * This example shows how to launch a new token and create a pool in one flow
 */

import { Vertigo } from "@vertigo/sdk";
import { Connection, Keypair } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import fs from "fs";
import os from "os";
import path from "path";

async function main() {
  // Load wallet
  const walletPath = path.join(os.homedir(), ".config/solana/id.json");
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

  try {
    // Launch token and create pool in one transaction
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

    // Get pool information
    const poolData = await vertigo.pools.getPool(result.poolAddress);
    if (poolData) {
      console.log("\n📊 Pool Information:");
      console.log(`- Mint A (SOL): ${poolData.mintA.toBase58()}`);
      console.log(`- Mint B (Token): ${poolData.mintB.toBase58()}`);
      console.log(`- Initial Reserve A: ${poolData.reserveA.toString()}`);
      console.log(`- Initial Reserve B: ${poolData.reserveB.toString()}`);
      console.log(`- Fee Rate: ${poolData.feeRate / 100}%`);
    }

    // Get a quote for buying the new token
    const quote = await vertigo.swap.getQuote({
      inputMint: poolData!.mintA, // SOL
      outputMint: result.mintAddress,
      amount: 1_000_000_000, // 1 SOL
      slippageBps: 100, // 1%
    });

    console.log("\n💱 Swap Quote (1 SOL -> Token):");
    console.log(`- Expected output: ${quote.outputAmount.toString()} tokens`);
    console.log(`- Fee: ${quote.fee.toString()} lamports`);
    console.log(`- Price Impact: ${quote.priceImpact.toFixed(2)}%`);

  } catch (error) {
    console.error("Failed to launch token with pool:", error);
  }
}

main().catch(console.error);