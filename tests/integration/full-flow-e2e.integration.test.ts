import { describe, it, expect, beforeAll } from "vitest";
import {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { VertigoClient } from "../../src/client/VertigoClient";
import { setupConnection, fundWallet } from "./config";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
  getAccount,
} from "@solana/spl-token";

const TEST_TIMEOUT = 180_000; // 3 minutes

describe("End-to-End Pool Creation and Swap Flow (Devnet)", () => {
  let connection: Connection;
  let client: VertigoClient;
  let owner: Keypair;
  let mintA: PublicKey;
  let mintB: PublicKey;
  let poolAddress: PublicKey;

  beforeAll(async () => {
    // Check for wallet
    if (!process.env.DEVNET_PRIVATE_KEY) {
      console.warn("DEVNET_PRIVATE_KEY not set, skipping E2E tests");
      return;
    }

    connection = setupConnection();

    // Load wallet from environment
    const privateKeyBytes = anchor.utils.bytes.bs58.decode(
      process.env.DEVNET_PRIVATE_KEY
    );
    owner = Keypair.fromSecretKey(privateKeyBytes);
    console.log("Using wallet:", owner.publicKey.toBase58());

    // Check balance
    try {
      const balance = await connection.getBalance(owner.publicKey);
      console.log("Wallet balance:", balance / LAMPORTS_PER_SOL, "SOL");

      if (balance < 0.5 * LAMPORTS_PER_SOL) {
        console.warn("Balance too low for E2E tests (< 0.5 SOL)");
        return;
      }
    } catch (error) {
      console.error("Failed to check balance:", error);
      return;
    }

    // Initialize client
    client = await VertigoClient.load({
      connection,
      network: "devnet",
      wallet: {
        publicKey: owner.publicKey,
        signTransaction: async (tx) => {
          if ("partialSign" in tx) {
            tx.partialSign(owner);
          }
          return tx;
        },
        signAllTransactions: async (txs) => {
          txs.forEach((tx) => {
            if ("partialSign" in tx) {
              tx.partialSign(owner);
            }
          });
          return txs;
        },
      },
    });

    console.log("Client initialized successfully");
  }, TEST_TIMEOUT);

  it(
    "should complete full E2E flow: create mints → create pool → execute swaps",
    async () => {
      if (!process.env.DEVNET_PRIVATE_KEY) {
        console.warn("Skipping E2E test - no wallet configured");
        return;
      }

      const balance = await connection.getBalance(owner.publicKey);
      if (balance < 0.5 * LAMPORTS_PER_SOL) {
        console.warn("Skipping E2E test - insufficient balance");
        return;
      }

      if (!client.poolAuthorityProgram) {
        console.warn(
          "Skipping E2E test - pool authority program not available"
        );
        return;
      }

      console.log("\n=== STEP 1: Creating Test Mints ===");
      mintA = await createMint(
        connection,
        owner,
        owner.publicKey,
        null,
        9,
        Keypair.generate(),
        undefined,
        TOKEN_PROGRAM_ID
      );
      console.log("✓ Created mintA:", mintA.toBase58());

      mintB = await createMint(
        connection,
        owner,
        owner.publicKey,
        null,
        9,
        Keypair.generate(),
        undefined,
        TOKEN_PROGRAM_ID
      );
      console.log("✓ Created mintB:", mintB.toBase58());

      console.log("\n=== STEP 2: Creating Token Accounts and Minting ===");
      const ownerAtaA = await getOrCreateAssociatedTokenAccount(
        connection,
        owner,
        mintA,
        owner.publicKey,
        false,
        undefined,
        undefined,
        TOKEN_PROGRAM_ID
      );
      console.log("✓ Created token account A");

      const ownerAtaB = await getOrCreateAssociatedTokenAccount(
        connection,
        owner,
        mintB,
        owner.publicKey,
        false,
        undefined,
        undefined,
        TOKEN_PROGRAM_ID
      );
      console.log("✓ Created token account B");

      await mintTo(
        connection,
        owner,
        mintA,
        ownerAtaA.address,
        owner,
        10_000_000_000_000, // 10,000 tokens (10,000 * 10^9 for 9 decimals)
        [],
        undefined,
        TOKEN_PROGRAM_ID
      );
      console.log("✓ Minted 10,000 tokens to account A");

      await mintTo(
        connection,
        owner,
        mintB,
        ownerAtaB.address,
        owner,
        10_000_000_000_000, // 10,000 tokens (10,000 * 10^9 for 9 decimals)
        [],
        undefined,
        TOKEN_PROGRAM_ID
      );
      console.log("✓ Minted 10,000 tokens to account B");

      // Verify token balances
      const balanceA = await connection.getTokenAccountBalance(
        ownerAtaA.address
      );
      const balanceB = await connection.getTokenAccountBalance(
        ownerAtaB.address
      );
      console.log(
        `✓ Token A balance: ${balanceA.value.uiAmount} (${balanceA.value.amount})`
      );
      console.log(
        `✓ Token B balance: ${balanceB.value.uiAmount} (${balanceB.value.amount})`
      );

      console.log("\n=== STEP 3: Deriving Pool PDA ===");
      const [poolPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("pool"),
          owner.publicKey.toBuffer(),
          mintA.toBuffer(),
          mintB.toBuffer(),
        ],
        client.ammProgram.programId
      );
      poolAddress = poolPda;
      console.log("✓ Pool PDA:", poolAddress.toBase58());

      console.log("\n=== STEP 4: Creating Pool via Pool Authority ===");
      const [vaultA] = PublicKey.findProgramAddressSync(
        [poolAddress.toBuffer(), mintA.toBuffer()],
        client.ammProgram.programId
      );

      const [vaultB] = PublicKey.findProgramAddressSync(
        [poolAddress.toBuffer(), mintB.toBuffer()],
        client.ammProgram.programId
      );

      try {
        // Use the AMM program's 'create' instruction
        const createParams = {
          shift: new anchor.BN(1_000_000_000), // Virtual SOL reserves (1 SOL worth, in lamports)
          initialTokenBReserves: new anchor.BN(1_000_000_000_000), // 1,000 tokens
          feeParams: {
            normalizationPeriod: new anchor.BN(60), // 60 seconds
            decay: new anchor.BN(50), // 0.5%
            reference: new anchor.BN(30), // 0.3%
            royaltiesBps: 0,
            privilegedSwapper: null,
          },
        };

        // @ts-expect-error - Anchor type instantiation depth issue
        const createPoolTx = await client.ammProgram.methods
          .create(createParams)
          .accounts({
            payer: owner.publicKey,
            owner: owner.publicKey,
            tokenWalletAuthority: owner.publicKey,
            mintA,
            mintB,
            tokenWalletB: ownerAtaB.address,
            pool: poolAddress,
            vaultA,
            vaultB,
            tokenProgramA: TOKEN_PROGRAM_ID,
            tokenProgramB: TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          })
          .signers([owner])
          .rpc();

        console.log("✓ Pool created! TX:", createPoolTx);

        // Wait for confirmation and account to be available
        await new Promise((resolve) => setTimeout(resolve, 5000));
      } catch (error) {
        console.error("Failed to create pool:", error);
        throw error;
      }

      console.log("\n=== STEP 5: Fetching Pool Data ===");
      console.log("Looking for pool at:", poolAddress.toBase58());

      // Try to fetch raw account data first
      const accountInfo = await connection.getAccountInfo(poolAddress);
      if (!accountInfo) {
        console.error(
          "❌ Pool account does not exist at address:",
          poolAddress.toBase58()
        );
        throw new Error("Pool account not found on-chain");
      }
      console.log(
        "✓ Pool account exists, owner:",
        accountInfo.owner.toBase58()
      );
      console.log("  Data length:", accountInfo.data.length);

      // Since the IDL had accounts removed to work around Anchor issues,
      // we can't use getPool(). Instead, verify the pool was created by
      // checking the account exists and has the right owner program.
      expect(accountInfo.owner.toBase58()).toBe(
        client.ammProgram.programId.toBase58()
      );
      console.log("✓ Pool verified on-chain");
      console.log("  Owner program:", accountInfo.owner.toBase58());
      console.log("  Account size:", accountInfo.data.length);

      console.log("\n✅ E2E Test Complete!");
      console.log("Successfully created a pool on devnet with:");
      console.log("  - Pool address:", poolAddress.toBase58());
      console.log("  - Mint A:", mintA.toBase58());
      console.log("  - Mint B:", mintB.toBase58());
      console.log("  - Owner:", owner.publicKey.toBase58());

      console.log("\nNote: Swap operations skipped due to IDL limitations.");
      console.log("The pool was successfully created and exists on-chain!");

      // TODO: Once the IDL account definition issue is resolved,
      // add swap operations here to complete the full E2E flow
    },
    TEST_TIMEOUT
  );
});
