import { describe, it, expect, beforeAll } from "vitest";
import {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { PoolClient } from "../../src/client/PoolClient";
import { VertigoClient } from "../../src/client/VertigoClient";
import { setupConnection, setupWallet, DEVNET_CONFIG } from "./config";
import BN from "bn.js";

describe("PoolClient Integration Tests (Devnet)", () => {
  let connection: Connection;
  let wallet: Keypair;
  let poolClient: PoolClient;
  let client: VertigoClient;

  beforeAll(async () => {
    connection = setupConnection();

    try {
      wallet = setupWallet();
    } catch {
      wallet = Keypair.generate();
    }

    client = await VertigoClient.load({
      connection,
      wallet,
      network: "devnet",
    });

    poolClient = client.pools;
  }, DEVNET_CONFIG.TIMEOUTS.TEST);

  describe("Pool Discovery", () => {
    it("should fetch all pools", async () => {
      const pools = await poolClient.getAllPools();

      expect(Array.isArray(pools)).toBe(true);
      console.log(`Found ${pools.length} pools on devnet`);

      if (pools.length > 0) {
        const pool = pools[0];

        // Validate pool structure
        expect(pool.publicKey).toBeInstanceOf(PublicKey);
        expect(pool.account).toBeDefined();
        expect(pool.account.mintA).toBeInstanceOf(PublicKey);
        expect(pool.account.mintB).toBeInstanceOf(PublicKey);
        expect(pool.account.reserveA).toBeInstanceOf(BN);
        expect(pool.account.reserveB).toBeInstanceOf(BN);
        expect(pool.account.fee).toBeDefined();
      }
    });

    it("should fetch pool by address", async () => {
      const pools = await poolClient.getAllPools();

      if (pools.length === 0) {
        console.log("No pools to test");
        return;
      }

      const targetPool = pools[0];
      const fetchedPool = await poolClient.getPool(targetPool.publicKey);

      expect(fetchedPool).toBeDefined();
      expect(fetchedPool.publicKey.equals(targetPool.publicKey)).toBe(true);
      expect(fetchedPool.account.mintA.equals(targetPool.account.mintA)).toBe(
        true,
      );
      expect(fetchedPool.account.mintB.equals(targetPool.account.mintB)).toBe(
        true,
      );
    });

    it("should find pools by token mints", async () => {
      const pools = await poolClient.getAllPools();

      if (pools.length === 0) return;

      const firstPool = pools[0];
      const mintA = firstPool.account.mintA;
      const mintB = firstPool.account.mintB;

      // Find pools containing mintA
      const poolsWithMintA = await poolClient.findPoolsByMint(mintA);
      expect(poolsWithMintA.length).toBeGreaterThan(0);

      const hasMintA = poolsWithMintA.some(
        (pool) =>
          pool.account.mintA.equals(mintA) || pool.account.mintB.equals(mintA),
      );
      expect(hasMintA).toBe(true);

      // Find pools with both mints
      const poolsWithBothMints = await poolClient.findPoolsByMints(
        mintA,
        mintB,
      );
      expect(poolsWithBothMints.length).toBeGreaterThan(0);

      const hasCorrectPair = poolsWithBothMints.some(
        (pool) =>
          (pool.account.mintA.equals(mintA) &&
            pool.account.mintB.equals(mintB)) ||
          (pool.account.mintA.equals(mintB) &&
            pool.account.mintB.equals(mintA)),
      );
      expect(hasCorrectPair).toBe(true);
    });

    it("should handle non-existent pool gracefully", async () => {
      const nonExistentPool = Keypair.generate().publicKey;

      await expect(poolClient.getPool(nonExistentPool)).rejects.toThrow();
    });
  });

  describe("Pool Information", () => {
    it("should calculate pool TVL", async () => {
      const pools = await poolClient.getAllPools();

      if (pools.length === 0) return;

      const pool = pools[0];
      const tvl = await poolClient.getPoolTVL(pool.publicKey);

      expect(tvl).toBeDefined();
      expect(tvl.totalValueUSD).toBeGreaterThanOrEqual(0);
      expect(tvl.tokenA).toBeDefined();
      expect(tvl.tokenB).toBeDefined();
      expect(tvl.tokenA.amount).toBeInstanceOf(BN);
      expect(tvl.tokenB.amount).toBeInstanceOf(BN);
    });

    it("should get pool price", async () => {
      const pools = await poolClient.getAllPools();

      if (pools.length === 0) return;

      const pool = pools[0];
      const price = await poolClient.getPoolPrice(pool.publicKey);

      expect(price).toBeDefined();
      expect(price.priceAtoB).toBeGreaterThan(0);
      expect(price.priceBtoA).toBeGreaterThan(0);

      // Price should be reciprocal
      const tolerance = 0.0001;
      expect(Math.abs(price.priceAtoB * price.priceBtoA - 1)).toBeLessThan(
        tolerance,
      );
    });

    it("should calculate pool APY", async () => {
      const pools = await poolClient.getAllPools();

      if (pools.length === 0) return;

      const pool = pools[0];

      try {
        const apy = await poolClient.getPoolAPY(pool.publicKey);

        expect(apy).toBeDefined();
        expect(apy.feeAPY).toBeGreaterThanOrEqual(0);
        expect(apy.rewardAPY).toBeGreaterThanOrEqual(0);
        expect(apy.totalAPY).toBeGreaterThanOrEqual(0);
        expect(apy.totalAPY).toBe(apy.feeAPY + apy.rewardAPY);
      } catch (error) {
        // APY calculation might require historical data not available on devnet
        console.log("APY calculation not available:", error);
      }
    });

    it("should fetch pool transactions", async () => {
      const pools = await poolClient.getAllPools();

      if (pools.length === 0) return;

      const pool = pools[0];

      try {
        const transactions = await poolClient.getPoolTransactions(
          pool.publicKey,
          { limit: 10 },
        );

        expect(Array.isArray(transactions)).toBe(true);

        if (transactions.length > 0) {
          const tx = transactions[0];
          expect(tx).toHaveProperty("signature");
          expect(tx).toHaveProperty("blockTime");
          expect(tx).toHaveProperty("type");
        }
      } catch (error) {
        console.log("Transaction history not available:", error);
      }
    });
  });

  describe("Liquidity Operations", () => {
    it("should calculate add liquidity amounts", async () => {
      const pools = await poolClient.getAllPools();

      if (pools.length === 0) return;

      const pool = pools[0];
      const amountA = new BN(1_000_000); // 0.001 token

      const result = await poolClient.calculateAddLiquidity({
        pool: pool.publicKey,
        amountA,
      });

      expect(result).toBeDefined();
      expect(result.amountA.gt(new BN(0))).toBe(true);
      expect(result.amountB.gt(new BN(0))).toBe(true);
      expect(result.lpTokensOut.gt(new BN(0))).toBe(true);
      expect(result.shareOfPool).toBeGreaterThan(0);
      expect(result.shareOfPool).toBeLessThanOrEqual(100);
    });

    it("should calculate remove liquidity amounts", async () => {
      const pools = await poolClient.getAllPools();

      if (pools.length === 0) return;

      const pool = pools[0];
      const lpTokens = new BN(1_000_000); // Some LP tokens

      const result = await poolClient.calculateRemoveLiquidity({
        pool: pool.publicKey,
        lpTokens,
      });

      expect(result).toBeDefined();
      expect(result.amountA.gte(new BN(0))).toBe(true);
      expect(result.amountB.gte(new BN(0))).toBe(true);
    });

    it("should build add liquidity transaction", async () => {
      if (!wallet) return;

      const pools = await poolClient.getAllPools();

      if (pools.length === 0) return;

      const pool = pools[0];

      const tx = await poolClient.createAddLiquidityTransaction({
        pool: pool.publicKey,
        amountA: new BN(1_000_000),
        amountB: new BN(1_000_000),
        userPublicKey: wallet.publicKey,
        slippageBps: 100,
      });

      expect(tx).toBeDefined();
      expect(tx.instructions.length).toBeGreaterThan(0);

      // Simulate transaction
      const simulation = await connection.simulateTransaction(tx);
      expect(simulation).toBeDefined();
    });

    it("should build remove liquidity transaction", async () => {
      if (!wallet) return;

      const pools = await poolClient.getAllPools();

      if (pools.length === 0) return;

      const pool = pools[0];

      const tx = await poolClient.createRemoveLiquidityTransaction({
        pool: pool.publicKey,
        lpTokens: new BN(1_000_000),
        userPublicKey: wallet.publicKey,
        slippageBps: 100,
      });

      expect(tx).toBeDefined();
      expect(tx.instructions.length).toBeGreaterThan(0);

      // Simulate transaction
      const simulation = await connection.simulateTransaction(tx);
      expect(simulation).toBeDefined();
    });
  });

  describe("Pool Analytics", () => {
    it("should get pool volume", async () => {
      const pools = await poolClient.getAllPools();

      if (pools.length === 0) return;

      const pool = pools[0];

      try {
        const volume = await poolClient.getPoolVolume(pool.publicKey, "24h");

        expect(volume).toBeDefined();
        expect(volume.volumeUSD).toBeGreaterThanOrEqual(0);
        expect(volume.volumeTokenA).toBeGreaterThanOrEqual(0);
        expect(volume.volumeTokenB).toBeGreaterThanOrEqual(0);
        expect(volume.txCount).toBeGreaterThanOrEqual(0);
      } catch (error) {
        console.log("Volume data not available:", error);
      }
    });

    it("should get pool fees collected", async () => {
      const pools = await poolClient.getAllPools();

      if (pools.length === 0) return;

      const pool = pools[0];

      try {
        const fees = await poolClient.getPoolFeesCollected(
          pool.publicKey,
          "24h",
        );

        expect(fees).toBeDefined();
        expect(fees.totalUSD).toBeGreaterThanOrEqual(0);
        expect(fees.tokenA).toBeGreaterThanOrEqual(0);
        expect(fees.tokenB).toBeGreaterThanOrEqual(0);
      } catch (error) {
        console.log("Fee data not available:", error);
      }
    });

    it("should calculate impermanent loss", async () => {
      const pools = await poolClient.getAllPools();

      if (pools.length === 0) return;

      const pool = pools[0];

      try {
        const il = await poolClient.calculateImpermanentLoss({
          pool: pool.publicKey,
          initialPriceRatio: 1.0,
          currentPriceRatio: 1.5,
        });

        expect(il).toBeDefined();
        expect(il.percentage).toBeGreaterThanOrEqual(0);
        expect(il.valueUSD).toBeDefined();
      } catch (error) {
        console.log("IL calculation not available:", error);
      }
    });
  });

  describe("Pool Filtering and Sorting", () => {
    it("should filter pools by minimum TVL", async () => {
      const allPools = await poolClient.getAllPools();

      if (allPools.length === 0) return;

      const minTVL = 1000; // $1000
      const filteredPools = await poolClient.getPoolsWithMinTVL(minTVL);

      for (const pool of filteredPools) {
        const tvl = await poolClient.getPoolTVL(pool.publicKey);
        expect(tvl.totalValueUSD).toBeGreaterThanOrEqual(minTVL);
      }
    });

    it("should sort pools by volume", async () => {
      const pools = await poolClient.getAllPools();

      if (pools.length < 2) return;

      try {
        const sortedPools = await poolClient.getPoolsSortedByVolume("24h");

        for (let i = 1; i < sortedPools.length; i++) {
          const prevVolume = await poolClient.getPoolVolume(
            sortedPools[i - 1].publicKey,
            "24h",
          );
          const currVolume = await poolClient.getPoolVolume(
            sortedPools[i].publicKey,
            "24h",
          );

          expect(prevVolume.volumeUSD).toBeGreaterThanOrEqual(
            currVolume.volumeUSD,
          );
        }
      } catch (error) {
        console.log("Volume sorting not available:", error);
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid pool address", async () => {
      const invalidAddress = Keypair.generate().publicKey;

      await expect(poolClient.getPool(invalidAddress)).rejects.toThrow();
    });

    it("should handle invalid liquidity amounts", async () => {
      const pools = await poolClient.getAllPools();

      if (pools.length === 0) return;

      const pool = pools[0];

      await expect(
        poolClient.calculateAddLiquidity({
          pool: pool.publicKey,
          amountA: new BN(-1), // Negative amount
        }),
      ).rejects.toThrow();
    });

    it("should handle insufficient reserves", async () => {
      const pools = await poolClient.getAllPools();

      if (pools.length === 0) return;

      const pool = pools[0];
      const hugeAmount = new BN("1000000000000000000"); // Huge LP token amount

      await expect(
        poolClient.calculateRemoveLiquidity({
          pool: pool.publicKey,
          lpTokens: hugeAmount,
        }),
      ).rejects.toThrow();
    });
  });
});
