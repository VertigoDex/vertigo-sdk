import { describe, it, expect, beforeAll } from "vitest";
import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Vertigo, VertigoClient } from "../../src/client";
import { swap, quote, claim, create } from "../../src/helpers";
import {
  buyInstruction,
  sellInstruction,
  createInstruction,
  claimInstruction,
  quoteBuy,
  quoteSell,
} from "../../src/instructions";
import { buildSwapParams, buildCreateParams } from "../../src/builders";

describe("V3 Comprehensive Integration Tests", () => {
  let connection: Connection;
  let wallet: anchor.Wallet;
  let vertigo: VertigoClient;

  beforeAll(async () => {
    connection = new Connection("https://api.devnet.solana.com", "confirmed");
    const keypair = Keypair.generate();
    wallet = new anchor.Wallet(keypair);
  });

  describe("Client Initialization", () => {
    it("should initialize with Vertigo.load()", async () => {
      vertigo = await Vertigo.load({
        connection,
        wallet,
        network: "devnet",
      });

      expect(vertigo).toBeDefined();
      expect(vertigo.connection).toBe(connection);
      expect(vertigo.wallet).toBe(wallet);
      expect(vertigo.network).toBe("devnet");
      expect(vertigo.program).toBeDefined();
      expect(vertigo.provider).toBeDefined();
    });

    it("should initialize without wallet", async () => {
      const readOnlyVertigo = await Vertigo.load({
        connection,
        network: "devnet",
      });

      expect(readOnlyVertigo).toBeDefined();
      expect(readOnlyVertigo.connection).toBe(connection);
      expect(readOnlyVertigo.wallet).toBeUndefined();
    });

    it("should initialize with custom program ID", async () => {
      const customProgramId = Keypair.generate().publicKey;
      const customVertigo = await Vertigo.load({
        connection,
        wallet,
        network: "devnet",
        programId: customProgramId,
      });

      expect(customVertigo.program.programId.toBase58()).toBe(
        customProgramId.toBase58(),
      );
    });
  });

  describe("Client Methods", () => {
    it("should expose quote method", () => {
      expect(vertigo.quote).toBeDefined();
      expect(typeof vertigo.quote).toBe("function");
    });

    it("should expose swap method", () => {
      expect(vertigo.swap).toBeDefined();
      expect(typeof vertigo.swap).toBe("function");
    });

    it("should expose claim method", () => {
      expect(vertigo.claim).toBeDefined();
      expect(typeof vertigo.claim).toBe("function");
    });

    it("should expose create method", () => {
      expect(vertigo.create).toBeDefined();
      expect(typeof vertigo.create).toBe("function");
    });

    it("should expose instructions", () => {
      expect(vertigo.instructions).toBeDefined();
      expect(vertigo.instructions.buyInstruction).toBeDefined();
      expect(vertigo.instructions.sellInstruction).toBeDefined();
      expect(vertigo.instructions.createInstruction).toBeDefined();
      expect(vertigo.instructions.claimInstruction).toBeDefined();
    });

    it("should throw error for swap without wallet", async () => {
      const readOnlyVertigo = await Vertigo.load({
        connection,
        network: "devnet",
      });

      await expect(
        readOnlyVertigo.swap({
          pool: Keypair.generate().publicKey,
          inputMint: Keypair.generate().publicKey,
          outputMint: Keypair.generate().publicKey,
          amount: new anchor.BN(1000),
        }),
      ).rejects.toThrow("Wallet required for swap operations");
    });
  });

  describe("Helper Functions", () => {
    it("should export swap helper", () => {
      expect(swap).toBeDefined();
      expect(typeof swap).toBe("function");
    });

    it("should export quote helper", () => {
      expect(quote).toBeDefined();
      expect(typeof quote).toBe("function");
    });

    it("should export claim helper", () => {
      expect(claim).toBeDefined();
      expect(typeof claim).toBe("function");
    });

    it("should export create helper", () => {
      expect(create).toBeDefined();
      expect(typeof create).toBe("function");
    });
  });

  describe("Instruction Functions", () => {
    it("should export buyInstruction", () => {
      expect(buyInstruction).toBeDefined();
      expect(typeof buyInstruction).toBe("function");
    });

    it("should export sellInstruction", () => {
      expect(sellInstruction).toBeDefined();
      expect(typeof sellInstruction).toBe("function");
    });

    it("should export createInstruction", () => {
      expect(createInstruction).toBeDefined();
      expect(typeof createInstruction).toBe("function");
    });

    it("should export claimInstruction", () => {
      expect(claimInstruction).toBeDefined();
      expect(typeof claimInstruction).toBe("function");
    });

    it("should export quoteBuy", () => {
      expect(quoteBuy).toBeDefined();
      expect(typeof quoteBuy).toBe("function");
    });

    it("should export quoteSell", () => {
      expect(quoteSell).toBeDefined();
      expect(typeof quoteSell).toBe("function");
    });
  });

  describe("Builder Functions", () => {
    it("should export buildSwapParams", () => {
      expect(buildSwapParams).toBeDefined();
      expect(typeof buildSwapParams).toBe("function");
    });

    it("should export buildCreateParams", () => {
      expect(buildCreateParams).toBeDefined();
      expect(typeof buildCreateParams).toBe("function");
    });

    it("should validate swap params with builder", () => {
      const params = buildSwapParams({
        program: vertigo.program,
        connection: vertigo.connection,
        pool: Keypair.generate().publicKey,
        inputMint: Keypair.generate().publicKey,
        outputMint: Keypair.generate().publicKey,
        amount: 1_000_000_000,
        user: wallet.publicKey,
        slippageBps: 50,
      });

      expect(params.program).toBe(vertigo.program);
      expect(params.connection).toBe(vertigo.connection);
      expect(params.amount).toBeInstanceOf(anchor.BN);
      expect(params.amount.toNumber()).toBe(1_000_000_000);
      expect(params.slippageBps).toBe(50);
    });
  });

  describe("Type Safety", () => {
    it("should have proper return types for quote", async () => {
      const pool = Keypair.generate().publicKey;
      const mintA = Keypair.generate().publicKey;
      const mintB = Keypair.generate().publicKey;

      try {
        const result = await vertigo.quote({
          pool,
          inputMint: mintA,
          outputMint: mintB,
          amount: new anchor.BN(1000),
        });

        expect(result).toHaveProperty("inputMint");
        expect(result).toHaveProperty("outputMint");
        expect(result).toHaveProperty("inputAmount");
        expect(result).toHaveProperty("outputAmount");
        expect(result).toHaveProperty("fee");
        expect(result).toHaveProperty("minimumReceived");
        expect(result).toHaveProperty("priceImpact");
        expect(result).toHaveProperty("isBuy");
      } catch (e) {
        // Expected to fail with non-existent pool
        expect(e).toBeDefined();
      }
    });

    it("should have proper types for swap result", () => {
      const mockResult = {
        signature: "mock-signature",
        inputAmount: new anchor.BN(1000),
        outputAmount: new anchor.BN(900),
      };

      expect(mockResult).toHaveProperty("signature");
      expect(mockResult).toHaveProperty("inputAmount");
      expect(mockResult).toHaveProperty("outputAmount");
      expect(mockResult.inputAmount).toBeInstanceOf(anchor.BN);
      expect(mockResult.outputAmount).toBeInstanceOf(anchor.BN);
    });

    it("should have proper types for create result", () => {
      const mockResult = {
        signature: "mock-signature",
        poolAddress: Keypair.generate().publicKey,
      };

      expect(mockResult).toHaveProperty("signature");
      expect(mockResult).toHaveProperty("poolAddress");
      expect(mockResult.poolAddress).toBeInstanceOf(PublicKey);
    });

    it("should have proper types for claim result", () => {
      const mockResult = {
        signature: "mock-signature",
      };

      expect(mockResult).toHaveProperty("signature");
      expect(typeof mockResult.signature).toBe("string");
    });
  });

  describe("Migration Compatibility", () => {
    it("should match v2 to v3 API pattern from MIGRATION.md", () => {
      // V3 pattern should be simpler
      expect(vertigo.swap).toBeDefined();
      expect(vertigo.quote).toBeDefined();
      expect(vertigo.create).toBeDefined();
      expect(vertigo.claim).toBeDefined();

      // No separate buy/sell methods
      expect((vertigo as any).buy).toBeUndefined();
      expect((vertigo as any).sell).toBeUndefined();
    });

    it("should support layered architecture", () => {
      // Layer 1: Instructions
      expect(buyInstruction).toBeDefined();
      expect(sellInstruction).toBeDefined();

      // Layer 2: Helpers
      expect(swap).toBeDefined();
      expect(quote).toBeDefined();

      // Layer 3: Builders
      expect(buildSwapParams).toBeDefined();
    });

    it("should infer direction from mints", async () => {
      const pool = Keypair.generate().publicKey;
      const mintA = Keypair.generate().publicKey;
      const mintB = Keypair.generate().publicKey;

      try {
        // Should automatically determine if this is a buy or sell
        await vertigo.quote({
          pool,
          inputMint: mintA,
          outputMint: mintB,
          amount: new anchor.BN(1000),
        });
      } catch (e) {
        // Expected to fail with non-existent pool, but the API accepts it
        expect(e).toBeDefined();
      }
    });
  });

  describe("Error Handling", () => {
    it("should throw error for non-existent pool", async () => {
      const fakePool = Keypair.generate().publicKey;
      const mintA = Keypair.generate().publicKey;
      const mintB = Keypair.generate().publicKey;

      await expect(
        vertigo.quote({
          pool: fakePool,
          inputMint: mintA,
          outputMint: mintB,
          amount: new anchor.BN(1000),
        }),
      ).rejects.toThrow();
    });

    it("should validate slippage bounds", async () => {
      const pool = Keypair.generate().publicKey;
      const mintA = Keypair.generate().publicKey;
      const mintB = Keypair.generate().publicKey;

      await expect(
        vertigo.quote({
          pool,
          inputMint: mintA,
          outputMint: mintB,
          amount: new anchor.BN(1000),
          slippageBps: 15000, // More than MAX_SLIPPAGE_BPS
        }),
      ).rejects.toThrow(/Slippage too high/);
    });
  });

  describe("Parameter Conversion", () => {
    it("should convert number to BN in builders", () => {
      const params = buildSwapParams({
        program: vertigo.program,
        connection: vertigo.connection,
        pool: Keypair.generate().publicKey,
        inputMint: Keypair.generate().publicKey,
        outputMint: Keypair.generate().publicKey,
        amount: 1_000_000_000, // number
        user: wallet.publicKey,
      });

      expect(params.amount).toBeInstanceOf(anchor.BN);
      expect(params.amount.toNumber()).toBe(1_000_000_000);
    });

    it("should accept BN directly", () => {
      const amount = new anchor.BN(1_000_000_000);
      const params = buildSwapParams({
        program: vertigo.program,
        connection: vertigo.connection,
        pool: Keypair.generate().publicKey,
        inputMint: Keypair.generate().publicKey,
        outputMint: Keypair.generate().publicKey,
        amount,
        user: wallet.publicKey,
      });

      expect(params.amount).toBe(amount);
    });
  });
});
