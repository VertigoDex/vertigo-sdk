import { describe, it, expect, beforeAll } from "vitest";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { Vertigo } from "../../src";
import { setupConnection } from "./config";

const TEST_TIMEOUT = 120_000;

describe("V3 API Integration Tests (Devnet)", () => {
  let connection: Connection;
  let vertigo: Awaited<ReturnType<typeof Vertigo.load>>;

  beforeAll(async () => {
    connection = setupConnection();
    vertigo = await Vertigo.load({
      connection,
      network: "devnet",
    });
  }, TEST_TIMEOUT);

  describe("Client Initialization", () => {
    it("should initialize client without wallet", async () => {
      expect(vertigo).toBeDefined();
      expect(vertigo.program).toBeDefined();
      expect(vertigo.connection).toBeDefined();
    });

    it("should have program ID configured", () => {
      expect(vertigo.program.programId).toBeDefined();
      expect(vertigo.program.programId.toString()).toBeTruthy();
    });
  });

  describe("Instructions Access", () => {
    it("should expose instructions module", () => {
      expect(vertigo.instructions).toBeDefined();
      expect(vertigo.instructions.buyInstruction).toBeDefined();
      expect(vertigo.instructions.sellInstruction).toBeDefined();
      expect(vertigo.instructions.createInstruction).toBeDefined();
      expect(vertigo.instructions.claimInstruction).toBeDefined();
    });
  });
});
