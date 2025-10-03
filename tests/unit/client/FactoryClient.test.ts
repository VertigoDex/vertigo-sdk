import { describe, it, expect, vi, beforeEach } from "vitest";
import { PublicKey, Keypair } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { FactoryClient } from "../../../src/client/FactoryClient";
import { VertigoClient } from "../../../src/client/VertigoClient";
import { createMockConnection, createMockWallet } from "../../mocks/connection";

// Mock the getPoolPda function
vi.mock("../../../src/utils/helpers", () => ({
  getPoolPda: vi
    .fn()
    .mockReturnValue([
      new PublicKey("BpfLoaderUpgradeab1e11111111111111111111111"),
      255,
    ]),
  getRpcUrl: vi.fn().mockReturnValue("http://localhost:8899"),
  validateLaunchParams: vi.fn(),
}));

// Mock token imports
vi.mock("@solana/spl-token", () => ({
  TOKEN_PROGRAM_ID: new PublicKey(
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
  ),
  TOKEN_2022_PROGRAM_ID: new PublicKey(
    "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
  ),
  NATIVE_MINT: new PublicKey("So11111111111111111111111111111111111111112"),
  MINT_SIZE: 82,
  getMinimumBalanceForRentExemptMint: vi.fn().mockResolvedValue(1461600),
  getAssociatedTokenAddressSync: vi
    .fn()
    .mockReturnValue(
      new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")
    ),
  createAssociatedTokenAccountIdempotentInstruction: vi.fn().mockReturnValue({
    keys: [],
    programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
    data: Buffer.from([]),
  }),
  createInitializeMint2Instruction: vi.fn().mockReturnValue({
    keys: [],
    programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
    data: Buffer.from([]),
  }),
  createMintToInstruction: vi.fn().mockReturnValue({
    keys: [],
    programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
    data: Buffer.from([]),
  }),
}));

describe("FactoryClient", () => {
  let factoryClient: FactoryClient;
  let mockClient: VertigoClient;

  beforeEach(async () => {
    const mockConnection = createMockConnection();
    const mockWallet = createMockWallet();

    mockClient = await VertigoClient.load({
      connection: mockConnection as any,
      wallet: mockWallet,
      network: "devnet",
    });

    factoryClient = new FactoryClient(mockClient);

    // Mock sendAndConfirm
    vi.spyOn(mockClient.provider, "sendAndConfirm").mockResolvedValue(
      "mockSignature123"
    );
  });

  describe("initialization", () => {
    it("should initialize with VertigoClient", () => {
      expect(factoryClient).toBeDefined();
      expect(factoryClient).toBeInstanceOf(FactoryClient);
    });
  });

  describe("launchToken", () => {
    it("should throw error when wallet not connected", async () => {
      const mockConnectionNoWallet = createMockConnection();
      const clientNoWallet = await VertigoClient.loadReadOnly({
        connection: mockConnectionNoWallet as any,
        network: "devnet",
      });

      const factoryClientNoWallet = new FactoryClient(clientNoWallet);

      await expect(
        factoryClientNoWallet.launchToken({
          metadata: {
            name: "Test Token",
            symbol: "TEST",
            decimals: 9,
          },
          supply: 1000000,
        })
      ).rejects.toThrow("Wallet not connected");
    });

    it("should create a new token with default decimals", async () => {
      const result = await factoryClient.launchToken({
        metadata: {
          name: "Test Token",
          symbol: "TEST",
        },
        supply: 1000000,
      });

      expect(result).toHaveProperty("signature");
      expect(result).toHaveProperty("mintAddress");
      expect(result.signature).toBe("mockSignature123");
      expect(result.mintAddress).toBeInstanceOf(PublicKey);
    });

    it("should create a new token with custom decimals", async () => {
      const result = await factoryClient.launchToken({
        metadata: {
          name: "Test Token",
          symbol: "TEST",
          decimals: 6,
        },
        supply: 1000000,
      });

      expect(result).toHaveProperty("signature");
      expect(result).toHaveProperty("mintAddress");
      expect(result.signature).toBe("mockSignature123");
    });

    it("should create a token with Token-2022 program", async () => {
      const result = await factoryClient.launchToken({
        metadata: {
          name: "Test Token 2022",
          symbol: "T22",
          decimals: 9,
        },
        supply: 1000000,
        useToken2022: true,
      });

      expect(result).toHaveProperty("signature");
      expect(result).toHaveProperty("mintAddress");
    });

    it("should accept transaction options", async () => {
      const result = await factoryClient.launchToken(
        {
          metadata: {
            name: "Test Token",
            symbol: "TEST",
          },
          supply: 1000000,
        },
        {
          skipPreflight: true,
          priorityFee: 1000,
        }
      );

      expect(result).toHaveProperty("signature");
      expect(result.signature).toBe("mockSignature123");
    });

    it("should handle large supply values", async () => {
      const result = await factoryClient.launchToken({
        metadata: {
          name: "Test Token",
          symbol: "TEST",
          decimals: 9,
        },
        supply: 1_000_000_000_000, // 1 trillion tokens
      });

      expect(result).toHaveProperty("signature");
      expect(result).toHaveProperty("mintAddress");
    });

    it("should include metadata URI when provided", async () => {
      const result = await factoryClient.launchToken({
        metadata: {
          name: "Test Token",
          symbol: "TEST",
          decimals: 9,
          uri: "https://example.com/token-metadata.json",
        },
        supply: 1000000,
      });

      expect(result).toHaveProperty("signature");
      expect(result).toHaveProperty("mintAddress");
    });
  });

  describe("launchTokenWithPool", () => {
    beforeEach(() => {
      // Mock the pools.createPool method
      vi.spyOn(mockClient.pools, "createPool").mockResolvedValue({
        signature: "mockPoolSignature",
        poolAddress: new PublicKey(
          "BpfLoaderUpgradeab1e11111111111111111111111"
        ),
      });
    });

    it("should throw error when wallet not connected", async () => {
      const mockConnectionNoWallet = createMockConnection();
      const clientNoWallet = await VertigoClient.loadReadOnly({
        connection: mockConnectionNoWallet as any,
        network: "devnet",
      });

      const factoryClientNoWallet = new FactoryClient(clientNoWallet);

      await expect(
        factoryClientNoWallet.launchTokenWithPool({
          metadata: {
            name: "Test Token",
            symbol: "TEST",
          },
          supply: 1000000,
          initialMarketCap: 50_000_000_000,
          royaltiesBps: 250,
        })
      ).rejects.toThrow("Wallet not connected");
    });

    it("should create token and pool", async () => {
      const result = await factoryClient.launchTokenWithPool({
        metadata: {
          name: "Test Token",
          symbol: "TEST",
          decimals: 9,
        },
        supply: 1000000,
        initialMarketCap: 50_000_000_000,
        royaltiesBps: 250,
      });

      expect(result).toHaveProperty("tokenSignature");
      expect(result).toHaveProperty("poolSignature");
      expect(result).toHaveProperty("mintAddress");
      expect(result).toHaveProperty("poolAddress");
      expect(result.tokenSignature).toBe("mockSignature123");
      expect(result.poolSignature).toBe("mockPoolSignature");
      expect(result.mintAddress).toBeInstanceOf(PublicKey);
      expect(result.poolAddress).toBeInstanceOf(PublicKey);
    });

    it("should create pool with SOL as base token", async () => {
      const createPoolSpy = vi.spyOn(mockClient.pools, "createPool");

      await factoryClient.launchTokenWithPool({
        metadata: {
          name: "Test Token",
          symbol: "TEST",
        },
        supply: 1000000,
        initialMarketCap: 50_000_000_000,
        royaltiesBps: 250,
      });

      expect(createPoolSpy).toHaveBeenCalled();
      const callArgs = createPoolSpy.mock.calls[0][0];
      expect(callArgs.mintA.toBase58()).toBe(
        "So11111111111111111111111111111111111111112"
      );
    });

    it("should pass royalties to pool creation", async () => {
      const createPoolSpy = vi.spyOn(mockClient.pools, "createPool");

      await factoryClient.launchTokenWithPool({
        metadata: {
          name: "Test Token",
          symbol: "TEST",
        },
        supply: 1000000,
        initialMarketCap: 50_000_000_000,
        royaltiesBps: 500,
      });

      expect(createPoolSpy).toHaveBeenCalled();
      const callArgs = createPoolSpy.mock.calls[0][0];
      expect(callArgs.royaltiesBps).toBe(500);
    });

    it("should handle launch time parameter", async () => {
      const createPoolSpy = vi.spyOn(mockClient.pools, "createPool");
      const launchTime = new anchor.BN(Date.now() / 1000 + 3600);

      await factoryClient.launchTokenWithPool({
        metadata: {
          name: "Test Token",
          symbol: "TEST",
        },
        supply: 1000000,
        initialMarketCap: 50_000_000_000,
        royaltiesBps: 250,
        launchTime,
      });

      expect(createPoolSpy).toHaveBeenCalled();
      const callArgs = createPoolSpy.mock.calls[0][0];
      expect(callArgs.launchTime).toEqual(launchTime);
    });

    it("should support Token-2022 with pool", async () => {
      const result = await factoryClient.launchTokenWithPool({
        metadata: {
          name: "Test Token 2022",
          symbol: "T22",
        },
        supply: 1000000,
        initialMarketCap: 50_000_000_000,
        royaltiesBps: 250,
        useToken2022: true,
      });

      expect(result).toHaveProperty("tokenSignature");
      expect(result).toHaveProperty("poolSignature");
      expect(result).toHaveProperty("mintAddress");
      expect(result).toHaveProperty("poolAddress");
    });

    it("should accept transaction options", async () => {
      const result = await factoryClient.launchTokenWithPool(
        {
          metadata: {
            name: "Test Token",
            symbol: "TEST",
          },
          supply: 1000000,
          initialMarketCap: 50_000_000_000,
          royaltiesBps: 250,
        },
        {
          skipPreflight: true,
          priorityFee: 1000,
        }
      );

      expect(result).toHaveProperty("tokenSignature");
      expect(result).toHaveProperty("poolSignature");
      expect(mockClient.provider.sendAndConfirm).toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    it("should handle zero supply", async () => {
      const result = await factoryClient.launchToken({
        metadata: {
          name: "Test Token",
          symbol: "TEST",
        },
        supply: 0,
      });

      expect(result).toHaveProperty("signature");
      expect(result).toHaveProperty("mintAddress");
    });

    it("should handle maximum decimals (9)", async () => {
      const result = await factoryClient.launchToken({
        metadata: {
          name: "Test Token",
          symbol: "TEST",
          decimals: 9,
        },
        supply: 1000000,
      });

      expect(result).toHaveProperty("signature");
    });

    it("should handle low decimals (0)", async () => {
      const result = await factoryClient.launchToken({
        metadata: {
          name: "Test Token",
          symbol: "TEST",
          decimals: 0,
        },
        supply: 1000000,
      });

      expect(result).toHaveProperty("signature");
    });
  });
});
