/**
 * Vertigo SDK - Using with a Wallet
 *
 * This example shows how to connect a wallet and execute swaps
 */

import { Vertigo } from "@vertigo/sdk";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { NATIVE_MINT } from "@solana/spl-token";
import fs from "fs";
import os from "os";
import path from "path";

async function main() {
  // 1. Load wallet from file (or use wallet adapter in browser)
  const walletPath = path.join(os.homedir(), ".config/solana/id.json");
  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(walletPath, "utf-8"))),
  );

  const wallet = new anchor.Wallet(walletKeypair);

  // 2. Initialize SDK with wallet
  const vertigo = await Vertigo.load({
    connection: new Connection("https://api.devnet.solana.com"),
    wallet,
    network: "devnet",
    priority: {
      autoFee: true, // Automatically calculate priority fees
    },
  });

  console.log(
    "✅ Vertigo SDK initialized with wallet:",
    wallet.publicKey.toBase58(),
  );

  // 3. Execute a swap
  const USDC_DEVNET = new PublicKey(
    "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
  );

  try {
    // First, simulate the swap
    const simulation = await vertigo.swap.simulateSwap({
      inputMint: NATIVE_MINT,
      outputMint: USDC_DEVNET,
      amount: 100_000_000, // 0.1 SOL
      options: {
        slippageBps: 100, // 1% slippage
        wrapSol: true, // Auto-wrap SOL
        unwrapSol: false,
      },
    });

    if (simulation.success) {
      console.log(
        `Simulation successful! Expected output: ${simulation.outputAmount?.toString()}`,
      );

      // Execute the actual swap
      const result = await vertigo.swap.swap({
        inputMint: NATIVE_MINT,
        outputMint: USDC_DEVNET,
        amount: 100_000_000,
        options: {
          slippageBps: 100,
          wrapSol: true,
          priorityFee: "auto", // Use automatic priority fee
        },
      });

      console.log("✅ Swap executed successfully!");
      console.log(`Transaction: ${result.signature}`);
      console.log(`Input: ${result.inputAmount.toString()} lamports`);
      console.log(`Output: ${result.outputAmount.toString()} USDC`);
    } else {
      console.log("❌ Simulation failed:", simulation.error);
    }
  } catch (error) {
    console.error("Failed to execute swap:", error);
  }

  // 4. Create a new pool
  try {
    const { signature, poolAddress } = await vertigo.pools.createPool({
      mintA: NATIVE_MINT,
      mintB: USDC_DEVNET,
      initialMarketCap: 10_000_000_000, // 10 SOL initial market cap
      royaltiesBps: 100, // 1% royalties
    });

    console.log("✅ Pool created successfully!");
    console.log(`Transaction: ${signature}`);
    console.log(`Pool Address: ${poolAddress.toBase58()}`);
  } catch (error) {
    console.error("Failed to create pool:", error);
  }
}

main().catch(console.error);
