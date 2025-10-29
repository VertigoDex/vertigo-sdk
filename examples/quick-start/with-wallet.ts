/**
 * Vertigo SDK - Using with a Wallet
 *
 * This example shows how to connect a wallet and execute swaps
 */

import { Vertigo } from "../../src";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { NATIVE_MINT } from "@solana/spl-token";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

async function main() {
  // 1. Load wallet from file (or use wallet adapter in browser)
  const walletPath = path.join(os.homedir(), ".config/solana/id.json");

  if (!fs.existsSync(walletPath)) {
    console.error(`Wallet not found at ${walletPath}`);
    console.log("Please create a wallet using: solana-keygen new");
    process.exit(1);
  }

  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(walletPath, "utf-8"))),
  );

  const wallet = new anchor.Wallet(walletKeypair);

  // 2. Initialize SDK with wallet
  const vertigo = await Vertigo.load({
    connection: new Connection("https://api.devnet.solana.com"),
    wallet,
    network: "devnet",
  });

  console.log(
    "✅ Vertigo SDK initialized with wallet:",
    wallet.publicKey.toBase58(),
  );

  // 3. Get wallet balance
  const balance = await vertigo.connection.getBalance(wallet.publicKey);
  console.log(`Wallet balance: ${(balance / 1e9).toFixed(4)} SOL`);

  if (balance === 0) {
    console.log("\n⚠️  Wallet has no SOL. Request airdrop with:");
    console.log(`solana airdrop 2 ${wallet.publicKey.toBase58()} --url devnet`);
    process.exit(0);
  }

  // 4. Example: Get swap quote
  const USDC_DEVNET = new PublicKey(
    "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
  );

  try {
    console.log("\n💱 Getting swap quote for 0.1 SOL -> USDC...");

    const quote = await vertigo.swap.getQuote({
      inputMint: NATIVE_MINT,
      outputMint: USDC_DEVNET,
      amount: 100_000_000, // 0.1 SOL
      slippageBps: 100, // 1% slippage
    });

    console.log(
      `Expected output: ${(quote.outputAmount.toNumber() / 1e6).toFixed(
        2,
      )} USDC`,
    );
    console.log(
      `Minimum received: ${(quote.minimumReceived.toNumber() / 1e6).toFixed(
        2,
      )} USDC`,
    );
    console.log(`Price impact: ${quote.priceImpact.toFixed(4)}%`);

    // 5. Simulate the swap
    console.log("\n🔍 Simulating swap...");
    const simulation = await vertigo.swap.simulateSwap({
      inputMint: NATIVE_MINT,
      outputMint: USDC_DEVNET,
      amount: 100_000_000,
      options: {
        slippageBps: 100,
        wrapSol: true,
      },
    });

    if (simulation.success) {
      console.log("✅ Simulation successful!");
      console.log("\nTo execute the swap, uncomment the code below:");
      console.log("/*");
      console.log("const result = await vertigo.swap.swap({");
      console.log("  inputMint: NATIVE_MINT,");
      console.log("  outputMint: USDC_DEVNET,");
      console.log("  amount: 100_000_000,");
      console.log(
        "  options: { slippageBps: 100, wrapSol: true, priorityFee: 'auto' }",
      );
      console.log("});");
      console.log("console.log(`Swap successful: ${result.signature}`);");
      console.log("*/");
    } else {
      console.log("❌ Simulation failed:", simulation.error);
    }
  } catch (error) {
    console.error(
      "Failed to get quote:",
      error instanceof Error ? error.message : error,
    );
  }

  // 6. Get all pools
  console.log("\n🏊 Fetching pools...");
  const allPools = await vertigo.pools.getAllPools();
  console.log(`Found ${allPools.length} pools on ${vertigo.network}`);
}

main().catch(console.error);
