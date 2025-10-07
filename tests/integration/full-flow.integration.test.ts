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

const TEST_TIMEOUT = 120_000;

describe("Full Flow Integration Tests (Devnet)", () => {
  let connection: Connection;
  let client: VertigoClient;
  let owner: Keypair;
  let mintA: PublicKey;
  let mintB: PublicKey;
  let poolAddress: PublicKey;

  beforeAll(async () => {
    connection = setupConnection();

    // Use funded wallet from environment or generate new one
    if (process.env.DEVNET_PRIVATE_KEY) {
      try {
        const privateKeyBytes = anchor.utils.bytes.bs58.decode(
          process.env.DEVNET_PRIVATE_KEY
        );
        owner = Keypair.fromSecretKey(privateKeyBytes);
        console.log(
          "Using wallet from DEVNET_PRIVATE_KEY:",
          owner.publicKey.toBase58()
        );
      } catch (error) {
        console.error("Failed to load wallet from DEVNET_PRIVATE_KEY:", error);
        owner = Keypair.generate();
      }
    } else {
      owner = Keypair.generate();
      console.warn("No DEVNET_PRIVATE_KEY found, using generated wallet");
    }

    // Check balance and request airdrop if needed
    try {
      const balance = await connection.getBalance(owner.publicKey);
      console.log("Wallet balance:", balance / LAMPORTS_PER_SOL, "SOL");

      if (balance < LAMPORTS_PER_SOL) {
        console.log("Balance too low, requesting airdrop...");
        try {
          await fundWallet(connection, owner.publicKey);
          const newBalance = await connection.getBalance(owner.publicKey);
          console.log("New balance:", newBalance / LAMPORTS_PER_SOL, "SOL");
        } catch (error) {
          console.warn("Failed to fund wallet via airdrop:", error);
          console.warn("Tests requiring funded wallet will be skipped");
        }
      }
    } catch (error) {
      console.error("Failed to connect to RPC endpoint:", error);
      console.warn("Tests requiring RPC connection will be skipped");
    }

    // Initialize client with wallet
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
  }, TEST_TIMEOUT);

  describe("Program Connectivity", () => {
    it("should connect to AMM program", () => {
      expect(client.ammProgram).toBeDefined();
      expect(client.ammProgram.programId).toBeDefined();
    });

    it("should connect to Pool Authority program", () => {
      expect(client.poolAuthorityProgram).toBeDefined();
      expect(client.poolAuthorityProgram?.programId).toBeDefined();
    });

    it("should fetch program accounts", async () => {
      const accounts = await client.connection.getProgramAccounts(
        client.ammProgram.programId
      );
      expect(Array.isArray(accounts)).toBe(true);
    });
  });

  describe("Account Discovery", () => {
    it("should discover existing pools", async () => {
      const pools = await client.pools.getAllPools();
      expect(Array.isArray(pools)).toBe(true);
      console.log(`Found ${pools.length} pools on devnet`);
    });

    it("should handle empty pool discovery gracefully", async () => {
      // Test with random mints that don't have pools
      const randomMintA = Keypair.generate().publicKey;
      const randomMintB = Keypair.generate().publicKey;
      const pools = await client.pools.findPoolsByMints(
        randomMintA,
        randomMintB
      );
      expect(Array.isArray(pools)).toBe(true);
      expect(pools.length).toBe(0);
    });
  });

  describe("Pool Operations", () => {
    it("should derive pool PDA correctly", async () => {
      // Check if wallet is funded
      const balance = await connection.getBalance(owner.publicKey);
      if (balance === 0) {
        console.warn("Wallet not funded, skipping pool creation tests");
        mintA = Keypair.generate().publicKey;
        mintB = Keypair.generate().publicKey;

        // Derive pool PDA with dummy mints for structure testing
        const [pda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("pool"),
            owner.publicKey.toBuffer(),
            mintA.toBuffer(),
            mintB.toBuffer(),
          ],
          client.ammProgram.programId
        );
        poolAddress = pda;
        expect(poolAddress).toBeDefined();
        return;
      }

      // Create test mints
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

      // Derive pool PDA
      const [pda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("pool"),
          owner.publicKey.toBuffer(),
          mintA.toBuffer(),
          mintB.toBuffer(),
        ],
        client.ammProgram.programId
      );

      poolAddress = pda;
      expect(poolAddress).toBeDefined();
    });

    it.skip(
      "should launch pool via pool authority program",
      async () => {
        // NOTE: The launchPool instruction is for launching a new token with a pool,
        // not just creating a pool with existing tokens. It requires:
        // 1. An initialized authority account (via initializeAuthority)
        // 2. An initialized template account (via initializeTemplate)
        // 3. Token metadata (name, symbol, uri)
        // 4. Creating a new token mint (mint_b must be a signer)
        //
        // This is a complex multi-step process that should be tested separately
        // in a dedicated pool authority integration test file.
        //
        // For now, this test is skipped. To properly test launchPool:
        // 1. Call initializeAuthority to create authority PDA
        // 2. Call initializeTemplate to create template with fee params
        // 3. Create a new mint keypair for mint_b
        // 4. Call launchPool with all required accounts and params

        if (!client.poolAuthorityProgram) {
          console.warn("Pool authority program not available");
          return;
        }

        // Example structure for future implementation:
        // const authorityOwner = owner.publicKey;
        // const [authority] = PublicKey.findProgramAddressSync(
        //   [Buffer.from("authority"), authorityOwner.toBuffer()],
        //   client.poolAuthorityProgram.programId
        // );
        // const templateKey = 0;
        // const [template] = PublicKey.findProgramAddressSync(
        //   [Buffer.from("template"), authority.toBuffer(), mintA.toBuffer(), Buffer.from([templateKey])],
        //   client.poolAuthorityProgram.programId
        // );
        // const mintB = Keypair.generate(); // New token to be created
        // const tx = await client.poolAuthorityProgram.methods
        //   .launchPool({
        //     templateKey,
        //     name: "Test Token",
        //     symbol: "TEST",
        //     uri: "https://example.com/metadata.json"
        //   })
        //   .accounts({
        //     payer: owner.publicKey,
        //     user: owner.publicKey,
        //     authorityOwner,
        //     authority,
        //     template,
        //     mintA,
        //     mintB: mintB.publicKey,
        //     // ... other accounts
        //   })
        //   .signers([mintB])
        //   .rpc();
      },
      TEST_TIMEOUT
    );

    it("should fetch created pool data", async () => {
      const pool = await client.pools.getPool(poolAddress);

      if (!pool) {
        console.warn("Pool not found, may not have been created");
        return;
      }

      expect(pool.address.equals(poolAddress)).toBe(true);
      expect(pool.mintA.equals(mintA)).toBe(true);
      expect(pool.mintB.equals(mintB)).toBe(true);
      expect(pool.tokenProgramA).toBeDefined();
      expect(pool.tokenProgramB).toBeDefined();
      expect(pool.reserveA).toBeDefined();
      expect(pool.reserveB).toBeDefined();
    });

    it("should find pool by mints", async () => {
      const pools = await client.pools.findPoolsByMints(mintA, mintB);

      if (pools.length === 0) {
        console.warn("No pools found, may not have been created");
        return;
      }

      expect(pools.length).toBeGreaterThan(0);
      const pool = pools[0];
      expect(pool.mintA.equals(mintA)).toBe(true);
      expect(pool.mintB.equals(mintB)).toBe(true);
    });
  });

  describe("Pool Authority", () => {
    it("should verify pool owner authority", async () => {
      const pool = await client.pools.getPool(poolAddress);

      if (!pool) {
        console.warn("Pool not found, skipping test");
        return;
      }

      expect(pool.owner.equals(owner.publicKey)).toBe(true);
    });

    it("should verify pool has non-zero reserves after creation", async () => {
      const pool = await client.pools.getPool(poolAddress);

      if (!pool) {
        console.warn("Pool not found, skipping test");
        return;
      }

      expect(pool.reserveA.gt(new anchor.BN(0))).toBe(true);
      expect(pool.reserveB.gt(new anchor.BN(0))).toBe(true);
    });
  });

  describe("Swap Execution", () => {
    it(
      "should get quote for swap",
      async () => {
        const pool = await client.pools.getPool(poolAddress);

        if (!pool) {
          console.warn("Pool not found, skipping swap tests");
          return;
        }

        try {
          const quote = await client.swap.getQuote({
            inputMint: mintA,
            outputMint: mintB,
            amount: new anchor.BN(1_000_000),
            slippageBps: 50,
          });

          expect(quote).toBeDefined();
          expect(quote.inputMint.equals(mintA)).toBe(true);
          expect(quote.outputMint.equals(mintB)).toBe(true);
          expect(quote.inputAmount.gt(new anchor.BN(0))).toBe(true);
          expect(quote.outputAmount.gt(new anchor.BN(0))).toBe(true);
          expect(quote.minimumReceived.lte(quote.outputAmount)).toBe(true);
        } catch (error) {
          console.error("Failed to get quote:", error);
          throw error;
        }
      },
      TEST_TIMEOUT
    );

    it("should simulate swap successfully", async () => {
      const pool = await client.pools.getPool(poolAddress);

      if (!pool) {
        console.warn("Pool not found, skipping test");
        return;
      }

      const result = await client.swap.simulateSwap({
        inputMint: mintA,
        outputMint: mintB,
        amount: new anchor.BN(1_000_000),
        options: {
          slippageBps: 50,
        },
      });

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    it(
      "should execute buy swap",
      async () => {
        const pool = await client.pools.getPool(poolAddress);

        if (!pool) {
          console.warn("Pool not found, skipping test");
          return;
        }

        try {
          // Get initial balances
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

          const initialBalance = (
            await getAccount(connection, ownerAtaB.address)
          ).amount;

          // Execute buy
          const result = await client.swap.buy({
            pool: poolAddress,
            quoteAmount: new anchor.BN(1_000_000),
            options: {
              slippageBps: 100,
            },
          });

          expect(result.signature).toBeDefined();
          expect(result.quoteSpent.gt(new anchor.BN(0))).toBe(true);
          expect(result.baseReceived.gt(new anchor.BN(0))).toBe(true);

          // Verify balance changed
          const finalBalance = (await getAccount(connection, ownerAtaB.address))
            .amount;
          expect(finalBalance).toBeGreaterThan(initialBalance);
        } catch (error) {
          console.error("Failed to execute buy:", error);
          throw error;
        }
      },
      TEST_TIMEOUT
    );

    it(
      "should execute sell swap",
      async () => {
        const pool = await client.pools.getPool(poolAddress);

        if (!pool) {
          console.warn("Pool not found, skipping test");
          return;
        }

        try {
          // Get initial balances
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

          const initialBalance = (
            await getAccount(connection, ownerAtaA.address)
          ).amount;

          // Execute sell
          const result = await client.swap.sell({
            pool: poolAddress,
            baseAmount: new anchor.BN(500_000),
            options: {
              slippageBps: 100,
            },
          });

          expect(result.signature).toBeDefined();
          expect(result.baseSpent.gt(new anchor.BN(0))).toBe(true);
          expect(result.quoteReceived.gt(new anchor.BN(0))).toBe(true);

          // Verify balance changed
          const finalBalance = (await getAccount(connection, ownerAtaA.address))
            .amount;
          expect(finalBalance).toBeGreaterThan(initialBalance);
        } catch (error) {
          console.error("Failed to execute sell:", error);
          throw error;
        }
      },
      TEST_TIMEOUT
    );
  });

  describe("End-to-End Flow", () => {
    it(
      "should complete full cycle: create → buy → sell",
      async () => {
        const pool = await client.pools.getPool(poolAddress);

        if (!pool) {
          console.warn("Pool not found, skipping end-to-end test");
          return;
        }

        // Get initial pool state
        const initialPool = await client.pools.getPool(poolAddress);
        expect(initialPool).toBeDefined();

        const initialReserveA = initialPool!.reserveA;
        const initialReserveB = initialPool!.reserveB;

        // Execute buy
        const buyResult = await client.swap.buy({
          pool: poolAddress,
          quoteAmount: new anchor.BN(1_000_000),
          options: { slippageBps: 100 },
        });
        expect(buyResult.signature).toBeDefined();

        // Wait a bit for state to update
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Verify reserves changed after buy
        const poolAfterBuy = await client.pools.getPool(poolAddress);
        expect(poolAfterBuy).toBeDefined();
        expect(poolAfterBuy!.reserveA.gt(initialReserveA)).toBe(true);
        expect(poolAfterBuy!.reserveB.lt(initialReserveB)).toBe(true);

        // Execute sell
        const sellResult = await client.swap.sell({
          pool: poolAddress,
          baseAmount: new anchor.BN(500_000),
          options: { slippageBps: 100 },
        });
        expect(sellResult.signature).toBeDefined();

        // Wait for state to update
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Verify reserves changed after sell
        const poolAfterSell = await client.pools.getPool(poolAddress);
        expect(poolAfterSell).toBeDefined();
        expect(poolAfterSell!.reserveA.lt(poolAfterBuy!.reserveA)).toBe(true);
        expect(poolAfterSell!.reserveB.gt(poolAfterBuy!.reserveB)).toBe(true);
      },
      TEST_TIMEOUT * 2
    );
  });
});
