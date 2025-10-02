/**
 * Vertigo SDK - Quick Start Guide
 *
 * This example shows the simplest way to get started with the Vertigo SDK
 */

import { Vertigo } from "../../src";
import { Connection, PublicKey } from "@solana/web3.js";
import { NATIVE_MINT } from "@solana/spl-token";

async function main() {
  // 1. Initialize the SDK (read-only, no wallet needed)
  const vertigo = await Vertigo.load({
    connection: new Connection("https://api.mainnet-beta.solana.com"),
    network: "mainnet",
  });

  console.log("✅ Vertigo SDK initialized");

  // 2. Find pools for a token pair
  const USDC_MAINNET = new PublicKey(
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
  );

  const pools = await vertigo.pools.findPoolsByMints(NATIVE_MINT, USDC_MAINNET);

  console.log(`Found ${pools.length} pools for SOL/USDC`);

  // 3. Get a swap quote (no wallet needed)
  if (pools.length > 0) {
    const quote = await vertigo.swap.getQuote({
      inputMint: NATIVE_MINT,
      outputMint: USDC_MAINNET,
      amount: 1_000_000_000, // 1 SOL
      slippageBps: 50, // 0.5%
    });

    console.log("\nSwap Quote:");
    console.log(
      `- Input: ${(quote.inputAmount.toNumber() / 1e9).toFixed(4)} SOL`
    );
    console.log(
      `- Output: ${(quote.outputAmount.toNumber() / 1e6).toFixed(2)} USDC`
    );
    console.log(`- Fee: ${(quote.fee.toNumber() / 1e9).toFixed(6)} SOL`);
    console.log(`- Price Impact: ${quote.priceImpact.toFixed(2)}%`);
  }

  // 4. Get pool information
  if (pools.length > 0) {
    const poolData = await vertigo.pools.getPool(pools[0].address);
    if (poolData) {
      console.log("\nPool Information:");
      console.log(`- Address: ${poolData.address.toBase58()}`);
      console.log(`- Reserve A: ${poolData.reserveA.toString()}`);
      console.log(`- Reserve B: ${poolData.reserveB.toString()}`);
      console.log(`- Fee Rate: ${poolData.feeRate / 100}%`);
    }
  }
}

main().catch(console.error);
