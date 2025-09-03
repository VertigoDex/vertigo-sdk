#!/usr/bin/env tsx

/**
 * Simple test script to verify SDK functionality without requiring deployed programs
 */

import {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import * as dotenv from "dotenv";
import bs58 from "bs58";
import chalk from "chalk";

dotenv.config();

async function main() {
  console.log(chalk.cyan.bold("\n🚀 Vertigo SDK v2 - Simple Test\n"));

  try {
    // Setup connection
    const connection = new Connection(
      "https://api.devnet.solana.com",
      "confirmed",
    );
    console.log(chalk.gray(`Connected to: https://api.devnet.solana.com`));

    // Setup wallet
    let wallet: Keypair;

    if (process.env.DEVNET_PRIVATE_KEY) {
      const privateKeyBytes = bs58.decode(
        process.env.DEVNET_PRIVATE_KEY.replace(/"/g, ""),
      );
      wallet = Keypair.fromSecretKey(privateKeyBytes);
      console.log(chalk.gray("Using wallet from .env"));
    } else {
      wallet = Keypair.generate();
      console.log(chalk.yellow("Generated ephemeral wallet"));
    }

    console.log(chalk.gray(`Wallet: ${wallet.publicKey.toBase58()}`));

    // Check balance
    const balance = await connection.getBalance(wallet.publicKey);
    console.log(chalk.gray(`Balance: ${balance / LAMPORTS_PER_SOL} SOL\n`));

    // Test Vertigo Programs on Devnet
    console.log(chalk.blue("Testing Vertigo Programs on Devnet..."));

    const programs = [
      { name: "AMM", address: "vrTGoBuy5rYSxAfV3jaRJWHH6nN9WK4NRExGxsk1bCJ" },
      {
        name: "Pool Authority",
        address: "Vert8xR82wYZrftk7PLcYJNxSdhLCCAMy7zbCNNSS4d",
      },
      {
        name: "Permissioned Relay",
        address: "FREEXMQuGxqrmT8gKJt82zfJjZACBiR8MNuQCbGSHyzF",
      },
      {
        name: "SPL Token Factory",
        address: "FactRtzKDU69a88rVZbnTofJFSVSDtzEHQG36NigvJjS",
      },
      {
        name: "Token 2022 Factory",
        address: "FAcTgvrF2jAiPnWEZGLCV3PTQJrypa8GXLFowBv8T4Vs",
      },
    ];

    for (const program of programs) {
      try {
        const programId = new PublicKey(program.address);
        const accountInfo = await connection.getAccountInfo(programId);
        if (accountInfo && accountInfo.executable) {
          console.log(
            chalk.green(`✅ ${program.name}: Deployed and executable`),
          );
        } else {
          console.log(
            chalk.red(`❌ ${program.name}: Not found or not executable`),
          );
        }
      } catch (error: any) {
        console.log(
          chalk.red(`❌ ${program.name}: Error checking - ${error.message}`),
        );
      }
    }

    // Test Anchor Program Creation
    console.log(chalk.blue("\nTesting Anchor Program Creation..."));

    const nodeWallet = new NodeWallet(wallet);
    const provider = new anchor.AnchorProvider(connection, nodeWallet, {
      commitment: "confirmed",
    });

    try {
      const ammProgramId = new PublicKey(
        "vrTGoBuy5rYSxAfV3jaRJWHH6nN9WK4NRExGxsk1bCJ",
      );
      const idl = await anchor.Program.fetchIdl(ammProgramId, provider);

      if (idl) {
        console.log(chalk.green("✅ AMM IDL fetched from chain"));
        console.log(
          chalk.gray(`   Instructions: ${idl.instructions?.length || 0}`),
        );

        // Try to create program instance
        const program = new anchor.Program(idl as any, ammProgramId, provider);
        console.log(chalk.green("✅ AMM Program instance created"));

        // List instructions
        console.log(chalk.gray("\n   Available instructions:"));
        for (const ix of idl.instructions || []) {
          console.log(chalk.gray(`     - ${ix.name}`));
        }
      } else {
        console.log(chalk.yellow("⚠️  No IDL found on chain for AMM"));
      }
    } catch (error: any) {
      console.log(chalk.red(`❌ Anchor program error: ${error.message}`));
    }

    // Test VertigoAPI (doesn't require programs)
    console.log(chalk.blue("\nTesting VertigoAPI..."));

    const { VertigoAPI } = await import("../../src/api/VertigoAPI");
    const api = new VertigoAPI("devnet");

    const apiTests = [
      {
        name: "Health Check",
        fn: async () => {
          try {
            const health = await api.healthCheck();
            return { success: true, data: health };
          } catch (error) {
            return {
              success: false,
              note: "API may not be available on devnet",
            };
          }
        },
      },
      {
        name: "Get Token Price (SOL)",
        fn: async () => {
          try {
            const price = await api.getTokenPrice(
              "So11111111111111111111111111111111111111112",
            );
            return { success: true, price: price.price };
          } catch (error) {
            return {
              success: false,
              note: "Price data may not be available on devnet",
            };
          }
        },
      },
    ];

    for (const test of apiTests) {
      console.log(chalk.gray(`\nTesting: ${test.name}`));
      const result = await test.fn();
      if (result.success) {
        console.log(chalk.green(`✅ ${test.name} passed`));
        if (result.data || result.price) {
          console.log(
            chalk.gray(
              `   Result: ${JSON.stringify(result.data || result.price)}`,
            ),
          );
        }
      } else {
        console.log(chalk.yellow(`⚠️  ${test.name}: ${result.note}`));
      }
    }

    // Test utility functions
    console.log(chalk.blue("\nTesting Utilities..."));

    const { formatTokenAmount, parseTokenAmount } = await import(
      "../../src/utils"
    );
    const BN = anchor.BN;

    const utilTests = [
      {
        name: "Format Token Amount",
        fn: () => {
          const amount = new BN(1000000000); // 1 token with 9 decimals as BN
          const formatted = formatTokenAmount(amount, 9);
          console.log(chalk.gray(`   Formatted: ${formatted}`));
          return typeof formatted === "string" && formatted.startsWith("1.");
        },
      },
      {
        name: "Parse Token Amount",
        fn: () => {
          const parsed = parseTokenAmount("1.5", 9);
          console.log(chalk.gray(`   Parsed: ${parsed.toString()}`));
          return parsed.toString() === "1500000000";
        },
      },
    ];

    for (const test of utilTests) {
      try {
        const passed = test.fn();
        if (passed) {
          console.log(chalk.green(`✅ ${test.name} passed`));
        } else {
          console.log(chalk.red(`❌ ${test.name} failed`));
        }
      } catch (error: any) {
        console.log(chalk.red(`❌ ${test.name} error: ${error.message}`));
      }
    }

    // Summary
    console.log(chalk.cyan.bold("\n📊 Test Summary"));
    console.log(chalk.gray("─".repeat(50)));
    console.log(chalk.green("✅ Basic connectivity working"));
    console.log(chalk.green("✅ Wallet configuration working"));
    console.log(chalk.green("✅ SDK modules can be imported"));
    console.log(
      chalk.yellow("⚠️  Full integration tests require deployed programs"),
    );
    console.log(chalk.gray("\nTo deploy programs for full testing:"));
    console.log(chalk.gray("1. Deploy Vertigo programs to devnet"));
    console.log(chalk.gray("2. Update program IDs in src/core/constants.ts"));
    console.log(chalk.gray("3. Run: yarn test:devnet"));
  } catch (error: any) {
    console.error(chalk.red("\n❌ Test failed:"), error);
    process.exit(1);
  }
}

main().catch(console.error);
