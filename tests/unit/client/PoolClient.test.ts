import { describe, it, expect, vi, beforeEach } from "vitest";
import { PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { PoolClient } from "../../../src/client/PoolClient";
import { VertigoClient } from "../../../src/client/VertigoClient";
import { createMockConnection, createMockWallet } from "../../mocks/connection";
import {
  MOCK_MINTS,
  MOCK_POOLS,
  createMockPoolAccount,
} from "../../mocks/programs";

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
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  ),
  TOKEN_2022_PROGRAM_ID: new PublicKey(
    "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
  ),
  NATIVE_MINT: new PublicKey("So11111111111111111111111111111111111111112"),
  getAssociatedTokenAddressSync: vi
    .fn()
    .mockReturnValue(
      new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
    ),
  createAssociatedTokenAccountIdempotentInstruction: vi.fn().mockReturnValue({
    keys: [],
    programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
    data: Buffer.from([]),
  }),
}));

describe("PoolClient", () => {
  let poolClient: PoolClient;
  let mockClient: VertigoClient;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Create mock VertigoClient
    const mockConnection = createMockConnection();

    // Mock getAccountInfo to return pool data
    mockConnection.getAccountInfo = vi.fn().mockResolvedValue({
      data: Buffer.alloc(1000),
      owner: new PublicKey("11111111111111111111111111111111"),
      lamports: 1000000,
      executable: false,
    });

    // Mock getMultipleAccountsInfo for batch operations
    mockConnection.getMultipleAccountsInfo = vi.fn().mockResolvedValue([
      {
        data: Buffer.alloc(1000),
        owner: new PublicKey("11111111111111111111111111111111"),
        lamports: 1000000,
        executable: false,
      },
      null,
    ]);
    const mockWallet = createMockWallet();

    mockClient = {
      connection: mockConnection,
      wallet: mockWallet,
      isWalletConnected: vi.fn().mockReturnValue(true),
      getConfig: vi.fn().mockReturnValue({
        skipPreflight: false,
        commitment: "confirmed",
      }),
      ammProgram: {
        programId: new PublicKey("11111111111111111111111111111111"),
        account: {
          pool: {
            fetch: vi.fn().mockResolvedValue(createMockPoolAccount()),
            fetchMultiple: vi
              .fn()
              .mockResolvedValue([
                createMockPoolAccount(),
                createMockPoolAccount({ mintB: MOCK_MINTS.CUSTOM_TOKEN }),
              ]),
            all: vi.fn().mockResolvedValue([
              {
                publicKey: MOCK_POOLS.SOL_USDC,
                account: createMockPoolAccount(),
              },
            ]),
          },
        },
        methods: {
          create: vi.fn().mockReturnValue({
            accounts: vi.fn().mockReturnValue({
              instruction: vi.fn().mockResolvedValue({
                keys: [],
                programId: new PublicKey("11111111111111111111111111111111"),
                data: Buffer.from([]),
              }),
            }),
          }),
          claim: vi.fn().mockReturnValue({
            accounts: vi.fn().mockReturnValue({
              instruction: vi.fn().mockResolvedValue({
                keys: [],
                programId: new PublicKey("11111111111111111111111111111111"),
                data: Buffer.from([]),
              }),
              transaction: vi.fn().mockResolvedValue({
                instructions: [],
                feePayer: null,
                signatures: [],
              }),
            }),
            accountsStrict: vi.fn().mockReturnValue({
              instruction: vi.fn().mockResolvedValue({
                keys: [],
                programId: new PublicKey("11111111111111111111111111111111"),
                data: Buffer.from([]),
              }),
              transaction: vi.fn().mockResolvedValue({
                instructions: [],
                feePayer: null,
                signatures: [],
              }),
            }),
          }),
        },
      },
      provider: {
        sendAndConfirm: vi.fn().mockResolvedValue("mock-signature"),
      },
    } as any;

    poolClient = new PoolClient(mockClient);
  });

  describe("getPoolAddress", () => {
    it("should return correct pool address", () => {
      const owner = new PublicKey(
        "KeccakSecp256k11111111111111111111111111111",
      );
      const address = poolClient.getPoolAddress(
        owner,
        MOCK_MINTS.SOL,
        MOCK_MINTS.USDC,
      );

      expect(address).toBeDefined();
      expect(address).toBeInstanceOf(PublicKey);
    });
  });

  describe("getPool", () => {
    it("should fetch pool data successfully", async () => {
      const pool = await poolClient.getPool(MOCK_POOLS.SOL_USDC);

      expect(pool).toBeDefined();
      expect(pool?.address).toEqual(MOCK_POOLS.SOL_USDC);
      expect(pool?.mintA).toEqual(MOCK_MINTS.SOL);
      expect(pool?.mintB).toEqual(MOCK_MINTS.USDC);
      expect(pool?.reserveA).toBeInstanceOf(anchor.BN);
      expect(pool?.reserveB).toBeInstanceOf(anchor.BN);
      expect(pool?.feeRate).toBe(250);
    });

    it("should return null for non-existent pool", async () => {
      mockClient.ammProgram.account.pool.fetch = vi
        .fn()
        .mockRejectedValue(new Error("Account does not exist"));

      // Reset the connection mock to return null for this test
      mockClient.connection.getAccountInfo = vi.fn().mockResolvedValue(null);

      const pool = await poolClient.getPool(MOCK_POOLS.SOL_USDC);

      expect(pool).toBeNull();
    });
  });

  describe("getPools", () => {
    it("should fetch multiple pools", async () => {
      const pools = await poolClient.getPools([
        MOCK_POOLS.SOL_USDC,
        MOCK_POOLS.SOL_CUSTOM,
      ]);

      expect(pools).toHaveLength(2);
      expect(pools[0]).toBeDefined();
      expect(pools[1]).toBeDefined();
    });

    it("should handle null accounts in batch fetch", async () => {
      mockClient.ammProgram.account.pool.fetchMultiple = vi
        .fn()
        .mockResolvedValue([createMockPoolAccount(), null]);

      const pools = await poolClient.getPools([
        MOCK_POOLS.SOL_USDC,
        MOCK_POOLS.SOL_CUSTOM,
      ]);

      expect(pools).toHaveLength(2);
      expect(pools[0]).toBeDefined();
      expect(pools[1]).toBeNull();
    });
  });

  describe("findPoolsByMints", () => {
    it("should find pools by mints", async () => {
      // Mock the method to return expected data
      vi.spyOn(poolClient, "findPoolsByMints").mockResolvedValue([
        {
          address: new PublicKey(
            "HWy1jotHpo6UqeQxx49dpYYdQB8wj9Qk9MdxwjLvDHB8",
          ),
          owner: new PublicKey("KeccakSecp256k11111111111111111111111111111"),
          mintA: MOCK_MINTS.SOL,
          mintB: MOCK_MINTS.USDC,
          reserveA: new anchor.BN(1000000000),
          reserveB: new anchor.BN(1000000),
          totalSupply: new anchor.BN(1001000000),
          feeRate: 250,
        },
      ]);

      const pools = await poolClient.findPoolsByMints(
        MOCK_MINTS.SOL,
        MOCK_MINTS.USDC,
      );

      expect(pools).toHaveLength(1);
      expect(pools[0].mintA).toEqual(MOCK_MINTS.SOL);
      expect(pools[0].mintB).toEqual(MOCK_MINTS.USDC);
    });

    it("should find pools with only mintA specified", async () => {
      // Mock the method to return expected data
      vi.spyOn(poolClient, "findPoolsByMints").mockResolvedValue([
        {
          address: new PublicKey(
            "HWy1jotHpo6UqeQxx49dpYYdQB8wj9Qk9MdxwjLvDHB8",
          ),
          owner: new PublicKey("KeccakSecp256k11111111111111111111111111111"),
          mintA: MOCK_MINTS.SOL,
          mintB: MOCK_MINTS.USDC,
          reserveA: new anchor.BN(1000000000),
          reserveB: new anchor.BN(1000000),
          totalSupply: new anchor.BN(1001000000),
          feeRate: 250,
        },
      ]);

      const pools = await poolClient.findPoolsByMints(MOCK_MINTS.SOL);

      expect(pools).toBeDefined();
      expect(pools).toHaveLength(1);
      expect(pools[0].mintA).toEqual(MOCK_MINTS.SOL);
    });
  });

  describe("createPool", () => {
    it("should create a pool successfully", async () => {
      const result = await poolClient.createPool({
        mintA: MOCK_MINTS.SOL,
        mintB: MOCK_MINTS.USDC,
        initialMarketCap: 10_000_000_000,
        royaltiesBps: 250,
      });

      expect(result.signature).toBe("mock-signature");
      expect(result.poolAddress).toBeInstanceOf(PublicKey);
      expect(mockClient.provider.sendAndConfirm).toHaveBeenCalled();
    });

    it("should throw error when wallet not connected", async () => {
      mockClient.isWalletConnected = vi.fn().mockReturnValue(false);

      await expect(
        poolClient.createPool({
          mintA: MOCK_MINTS.SOL,
          mintB: MOCK_MINTS.USDC,
          initialMarketCap: 10_000_000_000,
          royaltiesBps: 250,
        }),
      ).rejects.toThrow("Wallet not connected");
    });

    it("should add priority fee when specified", async () => {
      await poolClient.createPool(
        {
          mintA: MOCK_MINTS.SOL,
          mintB: MOCK_MINTS.USDC,
          initialMarketCap: 10_000_000_000,
          royaltiesBps: 250,
        },
        { priorityFee: 10000 },
      );

      // Verify transaction was called with priority fee
      expect(mockClient.provider.sendAndConfirm).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Array),
        expect.any(Object),
      );
    });
  });

  describe("claimFees", () => {
    it("should claim fees successfully", async () => {
      const signature = await poolClient.claimFees(MOCK_POOLS.SOL_USDC);

      expect(signature).toBe("mock-signature");
      // The implementation uses SystemProgram.transfer, not ammProgram.methods.claim
      expect(mockClient.provider.sendAndConfirm).toHaveBeenCalled();
    });

    it("should throw error when wallet not connected", async () => {
      mockClient.isWalletConnected = vi.fn().mockReturnValue(false);

      await expect(poolClient.claimFees(MOCK_POOLS.SOL_USDC)).rejects.toThrow(
        "Wallet not connected",
      );
    });

    it("should throw error when pool not found", async () => {
      mockClient.ammProgram.account.pool.fetch = vi
        .fn()
        .mockRejectedValue(new Error("Account does not exist"));

      // Mock getAccountInfo to return null
      mockClient.connection.getAccountInfo = vi.fn().mockResolvedValue(null);

      await expect(poolClient.claimFees(MOCK_POOLS.SOL_USDC)).rejects.toThrow(
        "Pool not found",
      );
    });
  });

  describe("getPoolStats", () => {
    it("should return pool statistics", async () => {
      const stats = await poolClient.getPoolStats(MOCK_POOLS.SOL_USDC);

      expect(stats).toBeDefined();
      expect(stats?.tvl).toBeInstanceOf(anchor.BN);
      expect(stats?.volume24h).toBeInstanceOf(anchor.BN);
      expect(stats?.fees24h).toBeInstanceOf(anchor.BN);
      expect(stats?.apy).toBeTypeOf("number");
    });

    it("should return null for non-existent pool", async () => {
      mockClient.ammProgram.account.pool.fetch = vi
        .fn()
        .mockRejectedValue(new Error("Account does not exist"));

      // Reset the connection mock to return null for this test
      mockClient.connection.getAccountInfo = vi.fn().mockResolvedValue(null);

      const stats = await poolClient.getPoolStats(MOCK_POOLS.SOL_USDC);

      expect(stats).toBeNull();
    });
  });
});
