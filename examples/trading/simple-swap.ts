/**
 * Vertigo SDK - Simple Swap Example
 *
 * This example shows how to perform a simple token swap on devnet
 */

import { Vertigo } from "../../src";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { NATIVE_MINT } from "@solana/spl-token";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

async function main() {
  // Configuration
  const USDC_DEVNET = new PublicKey(
    "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
  );
  const AMOUNT_TO_SWAP = 100_000_000; // 0.1 SOL
  const SLIPPAGE_BPS = 50; // 0.5%

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

  console.log("💱 Performing SOL -> USDC swap on devnet...");
  console.log(`Wallet: ${wallet.publicKey.toBase58()}`);

  // Check balance
  const balance = await vertigo.connection.getBalance(wallet.publicKey);
  console.log(`Balance: ${(balance / 1e9).toFixed(4)} SOL\n`);

  if (balance < AMOUNT_TO_SWAP) {
    console.error(
      `❌ Insufficient balance. Need at least ${(AMOUNT_TO_SWAP / 1e9).toFixed(
        4
      )} SOL`
    );
    console.log(
      `Request airdrop: solana airdrop 1 ${wallet.publicKey.toBase58()} --url devnet`
    );
    process.exit(1);
  }

  try {
    // Step 1: Get quote
    console.log("1️⃣ Getting quote...");
    const quote = await vertigo.swap.getQuote({
      inputMint: NATIVE_MINT,
      outputMint: USDC_DEVNET,
      amount: AMOUNT_TO_SWAP,
      slippageBps: SLIPPAGE_BPS,
    });

    console.log("Quote received:");
    console.log(
      `- Input: ${(quote.inputAmount.toNumber() / 1e9).toFixed(4)} SOL`
    );
    console.log(
      `- Expected output: ${(quote.outputAmount.toNumber() / 1e6).toFixed(
        2
      )} USDC`
    );
    console.log(
      `- Minimum received: ${(quote.minimumReceived.toNumber() / 1e6).toFixed(
        2
      )} USDC`
    );
    console.log(`- Price Impact: ${quote.priceImpact.toFixed(4)}%`);
    console.log(`- Fee: ${(quote.fee.toNumber() / 1e9).toFixed(6)} SOL`);

    // Step 2: Simulate swap
    console.log("\n2️⃣ Simulating swap...");
    const simulation = await vertigo.swap.simulateSwap({
      inputMint: NATIVE_MINT,
      outputMint: USDC_DEVNET,
      amount: AMOUNT_TO_SWAP,
      options: {
        slippageBps: SLIPPAGE_BPS,
        wrapSol: true,
      },
    });

    if (!simulation.success) {
      console.error("❌ Simulation failed:", simulation.error);
      process.exit(1);
    }

    console.log("✅ Simulation successful!");

    // Step 3: Execute swap
    console.log("\n3️⃣ Executing swap...");
    const result = await vertigo.swap.swap({
      inputMint: NATIVE_MINT,
      outputMint: USDC_DEVNET,
      amount: AMOUNT_TO_SWAP,
      options: {
        slippageBps: SLIPPAGE_BPS,
        wrapSol: true,
        priorityFee: "auto",
        retries: 3,
      },
    });

    console.log("\n✅ Swap completed successfully!");
    console.log(
      `Transaction: https://solscan.io/tx/${result.signature}?cluster=devnet`
    );
    console.log(
      `Input: ${(result.inputAmount.toNumber() / 1e9).toFixed(4)} SOL`
    );
    console.log(
      `Output: ${(result.outputAmount.toNumber() / 1e6).toFixed(2)} USDC`
    );
  } catch (error) {
    console.error(
      "❌ Swap failed:",
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  }
}

main().catch(console.error);
