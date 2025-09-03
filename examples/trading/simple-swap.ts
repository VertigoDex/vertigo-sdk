/**
 * Vertigo SDK - Simple Swap Example
 *
 * This example shows how to perform a simple token swap
 */

import { Vertigo } from "@vertigo/sdk";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { NATIVE_MINT } from "@solana/spl-token";
import fs from "fs";
import os from "os";
import path from "path";

async function main() {
  // Configuration
  const USDC_MAINNET = new PublicKey(
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  );
  const AMOUNT_TO_SWAP = 1_000_000_000; // 1 SOL
  const SLIPPAGE_BPS = 50; // 0.5%

  // Load wallet
  const walletPath = path.join(os.homedir(), ".config/solana/id.json");
  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(walletPath, "utf-8"))),
  );

  const wallet = new anchor.Wallet(walletKeypair);

  // Initialize SDK
  const vertigo = await Vertigo.load({
    connection: new Connection("https://api.mainnet-beta.solana.com"),
    wallet,
    network: "mainnet",
  });

  console.log("💱 Performing SOL -> USDC swap...");
  console.log(`Wallet: ${wallet.publicKey.toBase58()}`);

  try {
    // Step 1: Get quote
    console.log("\n1️⃣ Getting quote...");
    const quote = await vertigo.swap.getQuote({
      inputMint: NATIVE_MINT,
      outputMint: USDC_MAINNET,
      amount: AMOUNT_TO_SWAP,
      slippageBps: SLIPPAGE_BPS,
    });

    console.log("Quote received:");
    console.log(
      `- Input: ${(quote.inputAmount.toNumber() / 1e9).toFixed(4)} SOL`,
    );
    console.log(
      `- Expected output: ${(quote.outputAmount.toNumber() / 1e6).toFixed(2)} USDC`,
    );
    console.log(
      `- Minimum received: ${(quote.minimumReceived.toNumber() / 1e6).toFixed(2)} USDC`,
    );
    console.log(`- Price Impact: ${quote.priceImpact.toFixed(4)}%`);
    console.log(`- Fee: ${(quote.fee.toNumber() / 1e9).toFixed(6)} SOL`);

    // Step 2: Simulate swap
    console.log("\n2️⃣ Simulating swap...");
    const simulation = await vertigo.swap.simulateSwap({
      inputMint: NATIVE_MINT,
      outputMint: USDC_MAINNET,
      amount: AMOUNT_TO_SWAP,
      options: {
        slippageBps: SLIPPAGE_BPS,
        wrapSol: true,
        unwrapSol: false,
      },
    });

    if (!simulation.success) {
      console.error("❌ Simulation failed:", simulation.error);
      return;
    }

    console.log("✅ Simulation successful!");

    // Step 3: Execute swap
    console.log("\n3️⃣ Executing swap...");
    const result = await vertigo.swap.swap({
      inputMint: NATIVE_MINT,
      outputMint: USDC_MAINNET,
      amount: AMOUNT_TO_SWAP,
      options: {
        slippageBps: SLIPPAGE_BPS,
        wrapSol: true,
        priorityFee: "auto",
        retries: 3,
      },
    });

    console.log("\n✅ Swap completed successfully!");
    console.log(`Transaction: https://solscan.io/tx/${result.signature}`);
    console.log(
      `Input: ${(result.inputAmount.toNumber() / 1e9).toFixed(4)} SOL`,
    );
    console.log(
      `Output: ${(result.outputAmount.toNumber() / 1e6).toFixed(2)} USDC`,
    );
  } catch (error) {
    console.error("❌ Swap failed:", error);
  }
}

main().catch(console.error);
