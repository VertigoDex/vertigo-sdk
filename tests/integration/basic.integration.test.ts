import { describe, it, expect, beforeAll } from "vitest";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { VertigoClient } from "../../src/client";
import { setupConnection, DEVNET_CONFIG } from "./config";

describe("Basic Integration Tests (Devnet)", () => {
  let connection: Connection;
  let vertigo: VertigoClient;

  beforeAll(async () => {
    connection = setupConnection();

    vertigo = await VertigoClient.load({
      connection,
      network: "devnet",
    });
  }, DEVNET_CONFIG.TIMEOUTS.TEST);

  describe("Client Initialization", () => {
    it("should initialize VertigoClient", () => {
      expect(vertigo).toBeDefined();
      expect(vertigo.program).toBeDefined();
      expect(vertigo.connection).toBeDefined();
    });

    it("should have correct network configuration", () => {
      expect(vertigo.network).toBe("devnet");
      expect(vertigo.connection).toBeDefined();
    });

    it("should expose instructions module", () => {
      expect(vertigo.instructions).toBeDefined();
      expect(vertigo.instructions.buyInstruction).toBeDefined();
      expect(vertigo.instructions.sellInstruction).toBeDefined();
      expect(vertigo.instructions.createInstruction).toBeDefined();
      expect(vertigo.instructions.claimInstruction).toBeDefined();
    });
  });

  describe("Quote Functionality", () => {
    it("should have quote method", () => {
      expect(typeof vertigo.quote).toBe("function");
    });

    it("should handle quote for non-existent pool", async () => {
      const randomMint1 = Keypair.generate().publicKey;
      const randomMint2 = Keypair.generate().publicKey;
      const randomPool = Keypair.generate().publicKey;

      try {
        await vertigo.quote({
          pool: randomPool,
          inputMint: randomMint1,
          outputMint: randomMint2,
          amount: new anchor.BN(1000000),
          slippageBps: 50,
        });
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe("Program Configuration", () => {
    it("should have AMM program configured", () => {
      expect(vertigo.program).toBeDefined();
      expect(vertigo.program.programId).toBeDefined();
    });
  });
});
