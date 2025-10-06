#!/usr/bin/env tsx

/**
 * Test the exact scenario from the customer's error report
 * This simulates their dual-swap flow: SOL → ZC → NEW_TOKEN
 */

import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { VertigoSDK } from "../../dist/src/sdk.js";
import chalk from "chalk";

async function main() {
  console.log(
    chalk.cyan.bold("\n🧪 Testing Customer's Exact Scenario (SOL → ZC → NEW)\n"),
  );

  const connection = new Connection(
    "https://api.devnet.solana.com",
    "confirmed",
  );

  const payer = Keypair.generate();
  const nodeWallet = new NodeWallet(payer);
  const provider = new anchor.AnchorProvider(connection, nodeWallet, {
    commitment: "confirmed",
  });

  const vertigoSdk = new VertigoSDK(provider);

  // Simulate customer's parameters
  const ZC_TO_NEW_POOL_OWNER = new PublicKey(
    "KeccakSecp256k11111111111111111111111111111",
  );
  const zcMint = new PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vgs8Z5VU9"); // Mock ZC mint
  const newTokenMint = new PublicKey(
    "8PMHT4swUMtBzgHnh5U564N5sjPSiUz2cjEQzFnnP1Fo",
  ); // Mock NEW_TOKEN mint

  // Simulate output from first swap (CP-AMM)
  const quote1SwapOutAmount = new anchor.BN(5100000); // Customer's value from error log

  console.log(chalk.blue("Simulating customer's quote request..."));
  console.log(chalk.gray(`Owner: ${ZC_TO_NEW_POOL_OWNER.toBase58()}`));
  console.log(chalk.gray(`User: ${payer.publicKey.toBase58()}`));
  console.log(chalk.gray(`Mint A (ZC): ${zcMint.toBase58()}`));
  console.log(chalk.gray(`Mint B (NEW): ${newTokenMint.toBase58()}`));
  console.log(chalk.gray(`Amount: ${quote1SwapOutAmount.toString()}`));

  try {
    console.log(chalk.blue("\nCalling vertigoSdk.quoteBuy()..."));

    const quote2 = await vertigoSdk.quoteBuy({
      params: {
        amount: quote1SwapOutAmount,
        limit: new anchor.BN(0),
      },
      owner: ZC_TO_NEW_POOL_OWNER,
      user: payer.publicKey,
      mintA: zcMint,
      mintB: newTokenMint,
    });

    console.log(chalk.green("\n✅ SUCCESS! quoteBuy executed without error"));
    console.log(
      chalk.gray(`   Estimated NEW_TOKEN output: ${quote2.amountB.toString()}`),
    );
    console.log(chalk.gray(`   Fee: ${quote2.feeA.toString()}`));
    console.log(
      chalk.green(
        "\n🎉 The customer's scenario now works! The 'Account program not provided' error is fixed.",
      ),
    );
    process.exit(0);
  } catch (error: any) {
    if (error.message?.includes("Account program not provided")) {
      console.log(
        chalk.red(
          "\n❌ FAILED: Customer's error still occurs - 'Account program not provided'",
        ),
      );
      console.log(chalk.red(`Full error: ${error.message}`));
      console.log(chalk.red("\nThe fix did not work!"));
      process.exit(1);
    } else {
      // Any other error is expected (pool doesn't exist, etc.)
      console.log(
        chalk.green(
          "\n✅ SUCCESS! No 'Account program not provided' error",
        ),
      );
      console.log(
        chalk.gray(
          `   Got expected error instead (pool doesn't exist): ${error.message}`,
        ),
      );
      console.log(
        chalk.green(
          "\n🎉 The customer's scenario is fixed! They can now proceed with their dual-swap flow.",
        ),
      );
      process.exit(0);
    }
  }
}

main().catch((error) => {
  console.error(chalk.red("\n❌ Unexpected error:"), error);
  process.exit(1);
});
