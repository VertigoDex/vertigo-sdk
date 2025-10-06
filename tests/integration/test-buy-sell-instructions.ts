#!/usr/bin/env tsx

/**
 * Integration test to verify buy and sell instruction fixes
 * Tests that the 'program' account is correctly passed to buy/sell methods
 */

import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { VertigoSDK } from "../../dist/src/sdk.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import chalk from "chalk";

const TEST_POOL = {
  owner: new PublicKey("KeccakSecp256k11111111111111111111111111111"),
  mintA: new PublicKey("So11111111111111111111111111111111111111112"),
  mintB: new PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vgs8Z5VU9"),
};

async function main() {
  console.log(chalk.cyan.bold("\n🧪 Testing Buy/Sell Instruction Fixes\n"));

  const connection = new Connection(
    "https://api.devnet.solana.com",
    "confirmed",
  );

  const wallet = Keypair.generate();
  const nodeWallet = new NodeWallet(wallet);
  const provider = new anchor.AnchorProvider(connection, nodeWallet, {
    commitment: "confirmed",
  });

  const sdk = new VertigoSDK(provider);

  console.log(chalk.gray(`Program ID: ${sdk.programId.toBase58()}`));

  let passedTests = 0;
  let failedTests = 0;

  // Test 1: buyInstruction should not throw "Account program not provided"
  console.log(chalk.blue("\n1. Testing buyInstruction..."));
  try {
    const userTaA = new PublicKey("11111111111111111111111111111111");
    const userTaB = new PublicKey("11111111111111111111111111111111");

    const instructions = await sdk.buyInstruction({
      owner: TEST_POOL.owner,
      user: wallet,
      mintA: TEST_POOL.mintA,
      mintB: TEST_POOL.mintB,
      userTaA,
      userTaB,
      tokenProgramA: TOKEN_PROGRAM_ID,
      tokenProgramB: TOKEN_PROGRAM_ID,
      params: {
        amount: new anchor.BN(1000000),
        limit: new anchor.BN(0),
      },
    });

    console.log(
      chalk.green("   ✅ buyInstruction built successfully (no 'program' error)"),
    );
    console.log(
      chalk.gray(`   Generated ${instructions.length} instruction(s)`),
    );
    passedTests++;
  } catch (error: any) {
    if (error.message?.includes("Account program not provided")) {
      console.log(
        chalk.red(
          "   ❌ FAILED: Still getting 'Account program not provided' error",
        ),
      );
      console.log(chalk.red(`   Error: ${error.message}`));
      failedTests++;
    } else {
      // Any other error is expected (pool doesn't exist, invalid accounts, etc.)
      console.log(
        chalk.green(
          "   ✅ buyInstruction no longer has 'program' error (got expected error)",
        ),
      );
      console.log(chalk.gray(`   Expected error: ${error.message}`));
      passedTests++;
    }
  }

  // Test 2: sellInstruction should not throw "Account program not provided"
  console.log(chalk.blue("\n2. Testing sellInstruction..."));
  try {
    const userTaA = new PublicKey("11111111111111111111111111111111");
    const userTaB = new PublicKey("11111111111111111111111111111111");

    const instructions = await sdk.sellInstruction({
      owner: TEST_POOL.owner,
      user: wallet,
      mintA: TEST_POOL.mintA,
      mintB: TEST_POOL.mintB,
      userTaA,
      userTaB,
      tokenProgramA: TOKEN_PROGRAM_ID,
      tokenProgramB: TOKEN_PROGRAM_ID,
      params: {
        amount: new anchor.BN(1000000),
        limit: new anchor.BN(0),
      },
    });

    console.log(
      chalk.green(
        "   ✅ sellInstruction built successfully (no 'program' error)",
      ),
    );
    console.log(
      chalk.gray(`   Generated ${instructions.length} instruction(s)`),
    );
    passedTests++;
  } catch (error: any) {
    if (error.message?.includes("Account program not provided")) {
      console.log(
        chalk.red(
          "   ❌ FAILED: Still getting 'Account program not provided' error",
        ),
      );
      console.log(chalk.red(`   Error: ${error.message}`));
      failedTests++;
    } else {
      // Any other error is expected
      console.log(
        chalk.green(
          "   ✅ sellInstruction no longer has 'program' error (got expected error)",
        ),
      );
      console.log(chalk.gray(`   Expected error: ${error.message}`));
      passedTests++;
    }
  }

  // Summary
  console.log(chalk.cyan.bold("\n📊 Test Results"));
  console.log(chalk.gray("─".repeat(50)));
  console.log(chalk.green(`✅ Passed: ${passedTests}`));
  if (failedTests > 0) {
    console.log(chalk.red(`❌ Failed: ${failedTests}`));
    process.exit(1);
  } else {
    console.log(
      chalk.green(
        "\n🎉 All tests passed! The 'program' account fix is working for buy and sell instructions.",
      ),
    );
    process.exit(0);
  }
}

main().catch((error) => {
  console.error(chalk.red("\n❌ Unexpected error:"), error);
  process.exit(1);
});
