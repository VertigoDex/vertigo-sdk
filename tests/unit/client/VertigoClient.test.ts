import { describe, it, expect, vi, beforeEach } from "vitest";
import { Connection, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { VertigoClient } from "../../../src/client";
import { createMockConnection, createMockWallet } from "../../mocks/connection";
import { createMockProgram } from "../../mocks/programs";

vi.mock("@coral-xyz/anchor", async () => {
  const actual = await vi.importActual("@coral-xyz/anchor");
  return {
    ...actual,
    Program: vi.fn().mockImplementation((idl, provider) => {
      const programId = idl.metadata?.address
        ? new PublicKey(idl.metadata.address)
        : new PublicKey("11111111111111111111111111111111");
      return createMockProgram(programId);
    }),
  };
});

vi.mock("../../../target/idl/amm.json", () => ({
  default: {
    version: "0.1.0",
    name: "amm",
    instructions: [],
    accounts: [],
    metadata: {
      address: "AMM1111111111111111111111111111111111111111",
    },
  },
}));

describe("VertigoClient", () => {
  let mockConnection: Connection;

  beforeEach(() => {
    mockConnection = createMockConnection();
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    it("should initialize with connection only (read-only mode)", async () => {
      const vertigo = await VertigoClient.load({
        connection: mockConnection,
        network: "mainnet",
      });

      expect(vertigo).toBeDefined();
      expect(vertigo.connection).toBe(mockConnection);
      expect(vertigo.network).toBe("mainnet");
      expect(vertigo.wallet).toBeUndefined();
    });

    it("should initialize with wallet", async () => {
      const wallet = createMockWallet();
      const vertigo = await VertigoClient.load({
        connection: mockConnection,
        wallet,
        network: "mainnet",
      });

      expect(vertigo).toBeDefined();
      expect(vertigo.connection).toBe(mockConnection);
      expect(vertigo.wallet).toBe(wallet);
    });

    it("should use default configuration when not specified", async () => {
      const vertigo = await VertigoClient.load({
        network: "mainnet",
      });

      expect(vertigo.network).toBe("mainnet");
      expect(vertigo.connection).toBeDefined();
    });

    it("should initialize with custom program address", async () => {
      const customAmmAddress = new PublicKey(
        "CJsLwbP1iu5DuUikHEJnLfANgKy6stB2uFgvBBHoyxwz"
      );
      const vertigo = await VertigoClient.load({
        connection: mockConnection,
        network: "mainnet",
        programId: customAmmAddress,
      });

      expect(vertigo.program.programId).toEqual(customAmmAddress);
    });
  });

  describe("methods", () => {
    it("should have quote method", async () => {
      const vertigo = await VertigoClient.load({
        connection: mockConnection,
        network: "mainnet",
      });

      expect(typeof vertigo.quote).toBe("function");
    });

    it("should have swap method", async () => {
      const wallet = createMockWallet();
      const vertigo = await VertigoClient.load({
        connection: mockConnection,
        wallet,
        network: "mainnet",
      });

      expect(typeof vertigo.swap).toBe("function");
    });

    it("should have claim method", async () => {
      const wallet = createMockWallet();
      const vertigo = await VertigoClient.load({
        connection: mockConnection,
        wallet,
        network: "mainnet",
      });

      expect(typeof vertigo.claim).toBe("function");
    });

    it("should have create method", async () => {
      const wallet = createMockWallet();
      const vertigo = await VertigoClient.load({
        connection: mockConnection,
        wallet,
        network: "mainnet",
      });

      expect(typeof vertigo.create).toBe("function");
    });

    it("should expose instructions module", async () => {
      const vertigo = await VertigoClient.load({
        connection: mockConnection,
        network: "mainnet",
      });

      expect(vertigo.instructions).toBeDefined();
      expect(vertigo.instructions.buyInstruction).toBeDefined();
      expect(vertigo.instructions.sellInstruction).toBeDefined();
    });
  });

  describe("network configuration", () => {
    it("should use mainnet configuration", async () => {
      const vertigo = await VertigoClient.load({
        connection: mockConnection,
        network: "mainnet",
      });

      expect(vertigo.network).toBe("mainnet");
    });

    it("should use devnet configuration", async () => {
      const vertigo = await VertigoClient.load({
        connection: mockConnection,
        network: "devnet",
      });

      expect(vertigo.network).toBe("devnet");
    });

    it("should use localnet configuration", async () => {
      const vertigo = await VertigoClient.load({
        connection: mockConnection,
        network: "localnet",
      });

      expect(vertigo.network).toBe("localnet");
    });
  });

  describe("error handling", () => {
    it("should throw error when swap is called without wallet", async () => {
      const vertigo = await VertigoClient.load({
        connection: mockConnection,
        network: "mainnet",
      });

      await expect(async () => {
        await vertigo.swap({
          pool: PublicKey.default,
          inputMint: PublicKey.default,
          outputMint: PublicKey.default,
          amount: new anchor.BN(1000000),
        });
      }).rejects.toThrow("Wallet required for swap operations");
    });

    it("should throw error when claim is called without wallet", async () => {
      const vertigo = await VertigoClient.load({
        connection: mockConnection,
        network: "mainnet",
      });

      await expect(async () => {
        await vertigo.claim({
          pool: PublicKey.default,
        });
      }).rejects.toThrow("Wallet required for claim operations");
    });

    it("should throw error when create is called without wallet", async () => {
      const vertigo = await VertigoClient.load({
        connection: mockConnection,
        network: "mainnet",
      });

      await expect(async () => {
        await vertigo.create({
          owner: anchor.web3.Keypair.generate(),
          tokenWalletAuthority: anchor.web3.Keypair.generate(),
          mintA: PublicKey.default,
          mintB: PublicKey.default,
          initialMarketCap: new anchor.BN(1000000),
          initialTokenBReserves: new anchor.BN(1000000),
          royaltiesBps: 250,
        });
      }).rejects.toThrow("Wallet required for create operations");
    });
  });
});
