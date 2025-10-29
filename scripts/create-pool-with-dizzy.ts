import { Vertigo } from "../src";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import bs58 from "bs58";

const DIZZY_MINT = new PublicKey(
  "DiZZY2UQ2HSVsFDF6jADc6YYATiTfnQFw4Be1udRZmaY",
);

const main = async () => {
  console.log(
    "🚀 Creating a new token and pool with $DIZZY as quote asset on MAINNET...\n",
  );
  console.log("⚠️  WARNING: This will use REAL SOL on mainnet!");
  console.log("⚠️  Make sure you understand the costs before proceeding.\n");

  // Load wallet from environment
  const privateKey = process.env.DEVNET_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("DEVNET_PRIVATE_KEY environment variable not set");
  }

  const ownerKeypair = Keypair.fromSecretKey(bs58.decode(privateKey));
  console.log(`✅ Wallet loaded: ${ownerKeypair.publicKey.toBase58()}`);

  // Setup connection to MAINNET
  const connection = new Connection(
    "https://api.mainnet-beta.solana.com",
    "confirmed",
  );

  // Check wallet balance
  const balance = await connection.getBalance(ownerKeypair.publicKey);
  console.log(`💰 Wallet balance: ${balance / 1e9} SOL`);

  if (balance < 0.5e9) {
    console.warn(
      "⚠️  Low balance! You need at least 0.5 SOL for transactions on mainnet.",
    );
    throw new Error("Insufficient balance");
  }

  // Initialize Vertigo SDK for MAINNET
  const vertigo = await Vertigo.load({
    connection,
    wallet: new anchor.Wallet(ownerKeypair),
    network: "mainnet",
  });

  console.log("\n📝 Step 1: Creating new token mint...");

  // Generate mint keypair for the new token
  const mintKeypair = Keypair.generate();

  // Create the new token
  const newTokenMint = await createMint(
    connection,
    ownerKeypair,
    ownerKeypair.publicKey, // Mint authority
    null, // Freeze authority
    9, // Decimals
    mintKeypair,
    undefined,
    TOKEN_PROGRAM_ID,
  );

  console.log(`✅ New token created: ${newTokenMint.toBase58()}`);

  // Create token account for the owner and mint initial supply
  // (No separate tokenWalletAuthority - owner owns the pool directly)
  console.log("\n📝 Step 2: Minting initial token supply...");

  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    ownerKeypair,
    newTokenMint,
    ownerKeypair.publicKey, // Owner directly, not separate authority
  );

  const initialSupply = 1_000_000_000_000; // 1 trillion tokens (1T with 9 decimals)
  await mintTo(
    connection,
    ownerKeypair,
    newTokenMint,
    tokenAccount.address,
    ownerKeypair,
    initialSupply,
    [],
    undefined,
    TOKEN_PROGRAM_ID,
  );

  console.log(
    `✅ Minted ${
      initialSupply / 1e9
    } tokens to ${tokenAccount.address.toBase58()}`,
  );

  // Create pool with DIZZY as quote asset
  console.log("\n📝 Step 3: Creating pool with $DIZZY as quote asset...");
  console.log(`   Pair: ${newTokenMint.toBase58()} / DIZZY`);

  const initialTokenReserves = 1_000_000_000_000; // 1T tokens
  const initialMarketCap = 10_000_000_000; // 10B base units (adjust as needed)

  const { poolAddress, signature } = await vertigo.create({
    owner: ownerKeypair,
    tokenWalletAuthority: ownerKeypair, // Same as owner - direct ownership
    mintA: DIZZY_MINT, // $DIZZY as quote asset (what you pay/receive)
    mintB: newTokenMint, // Your new token (base asset - what you're trading)
    initialMarketCap: new anchor.BN(initialMarketCap),
    initialTokenBReserves: new anchor.BN(initialTokenReserves),
    royaltiesBps: 250, // 2.5% trading fee
    launchTime: new anchor.BN(Math.floor(Date.now() / 1000)),
    privilegedSwapper: undefined,
    priorityFee: 10000,
  });

  console.log("\n✅ Pool created successfully!");
  console.log(`   Pool address: ${poolAddress.toBase58()}`);
  console.log(`   Transaction: ${signature}`);
  console.log(`   New token: ${newTokenMint.toBase58()}`);
  console.log(`   Quote asset: DIZZY (${DIZZY_MINT.toBase58()})`);

  // Get a quote to verify the pool works
  console.log("\n📝 Step 4: Testing pool with a quote...");

  try {
    const quote = await vertigo.quote({
      pool: poolAddress,
      inputMint: DIZZY_MINT,
      outputMint: newTokenMint,
      amount: new anchor.BN(1_000_000_000), // 1 DIZZY (assuming 9 decimals)
      slippageBps: 50,
    });

    console.log(`✅ Quote successful!`);
    console.log(`   1 DIZZY = ${quote.outputAmount.toString()} new tokens`);
    console.log(`   Price impact: ${quote.priceImpact.toFixed(4)}%`);
  } catch (error) {
    console.log(
      `⚠️  Could not get quote (pool may need time to index): ${error}`,
    );
  }

  console.log(
    "\n🎉 Done! Your NEW/DIZZY pool is ready for trading on MAINNET!",
  );
  console.log("\n📊 Pool Summary:");
  console.log(`   Pool: ${poolAddress.toBase58()}`);
  console.log(`   Base token: ${newTokenMint.toBase58()}`);
  console.log(`   Quote token: DIZZY (${DIZZY_MINT.toBase58()})`);
  console.log(`   Trading fee: 2.5%`);
  console.log(
    `   Pool Explorer: https://explorer.solana.com/address/${poolAddress.toBase58()}`,
  );
  console.log(
    `   Token Explorer: https://explorer.solana.com/address/${newTokenMint.toBase58()}`,
  );
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
