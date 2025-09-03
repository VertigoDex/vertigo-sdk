import { describe, it, expect, beforeAll } from "vitest";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { VertigoClient } from "../../src/client/VertigoClient";
import { setupConnection, DEVNET_CONFIG } from "./config";

describe("Basic Integration Tests (Devnet)", () => {
  let connection: Connection;
  let client: VertigoClient;

  beforeAll(async () => {
    connection = setupConnection();

    // Initialize without wallet for read-only tests
    client = await VertigoClient.load({
      connection,
      network: "devnet",
    });
  }, DEVNET_CONFIG.TIMEOUTS.TEST);

  describe("Client Initialization", () => {
    it("should initialize VertigoClient", () => {
      expect(client).toBeDefined();
      expect(client.pools).toBeDefined();
      expect(client.swap).toBeDefined();
    });

    it("should have correct network configuration", () => {
      expect(client.network).toBe("devnet");
      expect(client.connection).toBeDefined();
    });
  });

  describe("Pool Client", () => {
    it("should have pool client methods", () => {
      expect(typeof client.pools.getPool).toBe("function");
      expect(typeof client.pools.getPools).toBe("function");
      expect(typeof client.pools.findPoolsByMints).toBe("function");
      expect(typeof client.pools.getAllPools).toBe("function");
    });

    it("should fetch all pools without error", async () => {
      // This will likely return empty array on devnet but shouldn't throw
      const pools = await client.pools.getAllPools();
      expect(Array.isArray(pools)).toBe(true);
    });

    it("should handle non-existent pool gracefully", async () => {
      const nonExistentPool = Keypair.generate().publicKey;
      const pool = await client.pools.getPool(nonExistentPool);
      expect(pool).toBeNull();
    });
  });

  describe("Swap Client", () => {
    it("should have swap client methods", () => {
      expect(typeof client.swap.getQuote).toBe("function");
      expect(typeof client.swap.simulateSwap).toBe("function");
    });

    it("should handle quote for non-existent pool", async () => {
      const randomMint1 = Keypair.generate().publicKey;
      const randomMint2 = Keypair.generate().publicKey;

      try {
        await client.swap.getQuote({
          inputMint: randomMint1,
          outputMint: randomMint2,
          amount: 1000000,
          slippageBps: 50,
        });
      } catch (error) {
        // Expected to fail - no pool exists
        expect(error).toBeDefined();
      }
    });
  });
});
