/**
 * Example: Using the Pool Authority Client
 *
 * The Pool Authority is separated from the main Vertigo SDK to avoid confusion
 * for regular users. It's only needed for advanced pool management features.
 *
 * NOTE: Pool Authority features are under development.
 */

import { Connection, Keypair } from "@solana/web3.js";
import { Vertigo, PoolAuthority } from "../src";
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
    Buffer.from(JSON.parse(fs.readFileSync(walletPath, "utf-8"))),
  );

  const wallet = new anchor.Wallet(walletKeypair);

  // Setup connection
  const connection = new Connection(
    "https://api.devnet.solana.com",
    "confirmed",
  );

  console.log("Wallet:", wallet.publicKey.toBase58());

  // Example 1: Regular SDK usage (most users only need this)
  console.log("\n=== Regular Vertigo SDK Usage ===");
  const vertigo = await Vertigo.load({
    connection,
    wallet,
    network: "devnet",
  });

  // Use normal SDK features
  const pools = await vertigo.pools.getAllPools();
  console.log(`Found ${pools.length} pools`);

  // Example 2: Pool Authority usage (advanced users only)
  console.log("\n=== Pool Authority Usage (Advanced) ===");
  console.log("⚠️  Note: Pool Authority features are under development");

  /*
  const poolAuthority = await PoolAuthority.load({
    connection,
    wallet,
    network: "devnet",
  });

  // Check if wallet has pool authority
  const hasAuthority = await poolAuthority.hasAuthority(wallet.publicKey);
  console.log("Has Pool Authority:", hasAuthority);

  if (!hasAuthority) {
    console.log("\nTo create a pool authority:");
    const { signature, authority } = await poolAuthority.createAuthority({
      owner: wallet.publicKey,
      feeRecipient: wallet.publicKey,
      defaultFeeRate: 30, // 0.3%
    });
    console.log("Authority created:", authority.toBase58());
  }
  */

  console.log("\n📚 SDK Import Patterns:");
  console.log("\n// For regular users (99% of use cases):");
  console.log("import { Vertigo } from '@vertigo-amm/vertigo-sdk';");
  console.log("const client = await Vertigo.load({ connection, wallet });");

  console.log("\n// For advanced users who need pool authority features:");
  console.log("import { PoolAuthority } from '@vertigo-amm/vertigo-sdk';");
  console.log(
    "const poolAuth = await PoolAuthority.load({ connection, wallet });",
  );

  console.log("\n// Both can be used together if needed:");
  console.log(
    "import { Vertigo, PoolAuthority } from '@vertigo-amm/vertigo-sdk';",
  );
}

main().catch(console.error);
