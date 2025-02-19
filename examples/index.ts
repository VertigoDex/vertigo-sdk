import { Connection, Keypair } from "@solana/web3.js";
import { VertigoSDK, createFeeParams, createPoolConfig } from "../dist";
import * as anchor from "@coral-xyz/anchor";

import { createMint, getAssociatedTokenAddress } from "@solana/spl-token";

async function example() {
  // Initialize connection and wallet
  const connection = new Connection("http://localhost:8899", "confirmed");
  const wallet = new anchor.Wallet(
    Keypair.fromSecretKey(
      Buffer.from(
        JSON.parse(
          require("fs").readFileSync(
            require("os").homedir() + "/.config/solana/id.json",
            "utf-8"
          )
        )
      )
    )
  );

  // Create SDK instance
  const sdk = new VertigoSDK(connection, wallet);
  const payer = wallet.payer;

  // WARN: We create the mint here for testing purposes only.
  // In production, create the mint yourself.
  const mintAuthority = Keypair.generate();
  const mint = await createMint(
    connection,
    payer,
    mintAuthority.publicKey,
    null,
    6
  );

  // NOTE: USER CONFIGURATION GOES HERE

  // Deployment settings
  const deployer = wallet.payer;
  const royaltiesOwner = wallet.payer;

  // Optional dev buy
  const dev = wallet.payer; // Developer wallet
  const devBuyAmount = new anchor.BN(anchor.web3.LAMPORTS_PER_SOL); // 1 SOL

  // Pool Settings
  const tokenDecimals = 6;
  const tokenAmount = new anchor.BN(1000000000 * 10 ** tokenDecimals); // One BILLION tokens
  const virtualSolAmount = new anchor.BN(100 * anchor.web3.LAMPORTS_PER_SOL); // 100 SOL

  const poolConfig = createPoolConfig(
    virtualSolAmount,
    tokenAmount,
    createFeeParams()
  );

  const { poolAddress, mintAddress, signature } = await sdk.launchPool(
    poolConfig,
    payer,
    mintAuthority,
    mint,
    deployer.publicKey,
    royaltiesOwner.publicKey,
    devBuyAmount,
    dev.publicKey
  );

  console.log("Pool launched!");
  console.log("Pool address:", poolAddress.toString());
  console.log("Mint address:", mintAddress.toString());
  console.log("Transaction signature:", signature);
  const devTokenAta = await getAssociatedTokenAddress(
    mintAddress,
    dev.publicKey
  );
  const devTokenBalance = await connection.getTokenAccountBalance(devTokenAta);
  console.log("Dev token balance:", devTokenBalance.value.uiAmount);

  // Get pool state
  const poolState = await sdk.getPoolState(poolAddress);

  // Format numbers to SOL/tokens with proper decimals
  const formatSOL = (lamports: anchor.BN) =>
    (lamports.toNumber() / anchor.web3.LAMPORTS_PER_SOL).toFixed(4) + " SOL";

  const formatTokens = (amount: anchor.BN) =>
    (amount.toNumber() / 10 ** 6).toFixed(2) + " tokens";

  console.log("\n📊 Pool State");
  console.log("══════════════════════════════════");
  console.log(`🏦 SOL Reserves:     ${formatSOL(poolState.lamportsReserves)}`);
  console.log(`💎 Token Reserves:   ${formatTokens(poolState.tokenReserves)}`);
  console.log(`📈 Bonding Constant: ${formatSOL(poolState.constant)}`);
  console.log("\n💰 Fees");
  console.log(`   • Royalties:      ${formatSOL(poolState.royalties)}`);
  console.log(`   • Protocol Fees:  ${formatSOL(poolState.protocolFees)}`);
  console.log("\n⚙️  Fee Parameters");
  console.log(
    `   • Royalty Rate:   ${poolState.feeParams.royaltiesBps / 100}%`
  );
  console.log(
    `   • Protocol Rate:  ${poolState.feeParams.protocolFeeBps / 100}%`
  );
  if (poolState.feeParams.feeExemptBuys > 0) {
    console.log(
      `   • Fee Exempt:     ${poolState.feeParams.feeExemptBuys} buys remaining`
    );
  }
  console.log("══════════════════════════════════\n");
}

example().catch(console.error);
