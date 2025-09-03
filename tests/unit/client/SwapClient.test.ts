import { describe, it, expect, vi, beforeEach } from "vitest";
import { PublicKey, Transaction } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { SwapClient } from "../../../src/client/SwapClient";
import { VertigoClient } from "../../../src/client/VertigoClient";
import { createMockConnection, createMockWallet } from "../../mocks/connection";
import {
  MOCK_MINTS,
  MOCK_POOLS,
  createMockPoolAccount,
} from "../../mocks/programs";
import {
  DEFAULT_SLIPPAGE_BPS,
  MAX_SLIPPAGE_BPS,
} from "../../../src/core/constants";

// Mock token imports
vi.mock("@solana/spl-token", () => ({
  TOKEN_PROGRAM_ID: new PublicKey(
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
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
  createSyncNativeInstruction: vi.fn().mockReturnValue({
    keys: [],
    programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
    data: Buffer.from([]),
  }),
  createCloseAccountInstruction: vi.fn().mockReturnValue({
    keys: [],
    programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
    data: Buffer.from([]),
  }),
}));

describe("SwapClient", () => {
  let swapClient: SwapClient;
  let mockClient: any;
  let mockPoolClient: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    const mockConnection = createMockConnection();
    const mockWallet = createMockWallet();

    // Mock pool client
    mockPoolClient = {
      findPoolsByMints: vi.fn().mockResolvedValue([
        {
          address: MOCK_POOLS.SOL_USDC,
          owner: new PublicKey("KeccakSecp256k11111111111111111111111111111"),
          mintA: MOCK_MINTS.SOL,
          mintB: MOCK_MINTS.USDC,
          reserveA: new anchor.BN(1000000000),
          reserveB: new anchor.BN(1000000),
          feeRate: 250,
        },
      ]),
      getPool: vi.fn().mockResolvedValue({
        address: MOCK_POOLS.SOL_USDC,
        owner: new PublicKey("KeccakSecp256k11111111111111111111111111111"),
        mintA: MOCK_MINTS.SOL,
        mintB: MOCK_MINTS.USDC,
        reserveA: new anchor.BN(1000000000),
        reserveB: new anchor.BN(1000000),
        feeRate: 250,
      }),
    };

    // Create mock client
    mockClient = {
      connection: mockConnection,
      wallet: mockWallet,
      isWalletConnected: vi.fn().mockReturnValue(true),
      getConfig: vi.fn().mockReturnValue({
        skipPreflight: false,
        commitment: "confirmed",
      }),
      pools: mockPoolClient,
      ammProgram: {
        programId: new PublicKey("11111111111111111111111111111111"),
        methods: {
          quoteBuy: vi.fn().mockReturnValue({
            accounts: vi.fn().mockReturnValue({
              view: vi.fn().mockResolvedValue({
                newReservesA: new anchor.BN(1000000000),
                newReservesB: new anchor.BN(1000000),
                amountA: new anchor.BN(1000000),
                amountB: new anchor.BN(990000),
                feeA: new anchor.BN(10000),
              }),
            }),
            accountsStrict: vi.fn().mockReturnValue({
              view: vi.fn().mockResolvedValue({
                newReservesA: new anchor.BN(1000000000),
                newReservesB: new anchor.BN(1000000),
                amountA: new anchor.BN(1000000),
                amountB: new anchor.BN(990000),
                feeA: new anchor.BN(10000),
              }),
            }),
          }),
          quoteSell: vi.fn().mockReturnValue({
            accounts: vi.fn().mockReturnValue({
              view: vi.fn().mockResolvedValue({
                newReservesA: new anchor.BN(1000000000),
                newReservesB: new anchor.BN(1000000),
                amountA: new anchor.BN(990000000),
                amountB: new anchor.BN(1000000),
                feeA: new anchor.BN(10000000),
              }),
            }),
            accountsStrict: vi.fn().mockReturnValue({
              view: vi.fn().mockResolvedValue({
                newReservesA: new anchor.BN(1000000000),
                newReservesB: new anchor.BN(1000000),
                amountA: new anchor.BN(990000000),
                amountB: new anchor.BN(1000000),
                feeA: new anchor.BN(10000000),
              }),
            }),
          }),
          buy: vi.fn().mockReturnValue({
            accounts: vi.fn().mockReturnValue({
              instruction: vi.fn().mockResolvedValue({
                keys: [],
                programId: new PublicKey("11111111111111111111111111111111"),
                data: Buffer.from([]),
              }),
            }),
            accountsStrict: vi.fn().mockReturnValue({
              instruction: vi.fn().mockResolvedValue({
                keys: [],
                programId: new PublicKey("11111111111111111111111111111111"),
                data: Buffer.from([]),
              }),
            }),
          }),
          sell: vi.fn().mockReturnValue({
            accounts: vi.fn().mockReturnValue({
              instruction: vi.fn().mockResolvedValue({
                keys: [],
                programId: new PublicKey("11111111111111111111111111111111"),
                data: Buffer.from([]),
              }),
            }),
            accountsStrict: vi.fn().mockReturnValue({
              instruction: vi.fn().mockResolvedValue({
                keys: [],
                programId: new PublicKey("11111111111111111111111111111111"),
                data: Buffer.from([]),
              }),
            }),
          }),
        },
      },
      provider: {
        sendAndConfirm: vi.fn().mockResolvedValue("mock-signature"),
      },
    };

    swapClient = new SwapClient(mockClient);
  });

  describe("getQuote", () => {
    it("should get quote for SOL to USDC swap", async () => {
      const quote = await swapClient.getQuote({
        inputMint: MOCK_MINTS.SOL,
        outputMint: MOCK_MINTS.USDC,
        amount: 1000000000, // 1 SOL
      });

      expect(quote).toBeDefined();
      expect(quote.inputMint).toEqual(MOCK_MINTS.SOL);
      expect(quote.outputMint).toEqual(MOCK_MINTS.USDC);
      expect(quote.inputAmount).toBeInstanceOf(anchor.BN);
      expect(quote.outputAmount).toBeInstanceOf(anchor.BN);
      expect(quote.fee).toBeInstanceOf(anchor.BN);
      expect(quote.priceImpact).toBeTypeOf("number");
      expect(quote.minimumReceived).toBeInstanceOf(anchor.BN);
      expect(quote.route).toHaveLength(1);
    });

    it("should use default slippage when not specified", async () => {
      const quote = await swapClient.getQuote({
        inputMint: MOCK_MINTS.SOL,
        outputMint: MOCK_MINTS.USDC,
        amount: 1000000000,
      });

      const expectedMinimum = new anchor.BN(990000)
        .mul(new anchor.BN(10000 - DEFAULT_SLIPPAGE_BPS))
        .div(new anchor.BN(10000));

      expect(quote.minimumReceived.toString()).toBe(expectedMinimum.toString());
    });

    it("should respect custom slippage", async () => {
      const slippageBps = 100; // 1%
      const quote = await swapClient.getQuote({
        inputMint: MOCK_MINTS.SOL,
        outputMint: MOCK_MINTS.USDC,
        amount: 1000000000,
        slippageBps,
      });

      const expectedMinimum = new anchor.BN(990000)
        .mul(new anchor.BN(10000 - slippageBps))
        .div(new anchor.BN(10000));

      expect(quote.minimumReceived.toString()).toBe(expectedMinimum.toString());
    });

    it("should throw error for excessive slippage", async () => {
      await expect(
        swapClient.getQuote({
          inputMint: MOCK_MINTS.SOL,
          outputMint: MOCK_MINTS.USDC,
          amount: 1000000000,
          slippageBps: MAX_SLIPPAGE_BPS + 1,
        }),
      ).rejects.toThrow(`Slippage too high`);
    });

    it("should handle BN amounts", async () => {
      const amount = new anchor.BN(1000000000);
      const quote = await swapClient.getQuote({
        inputMint: MOCK_MINTS.SOL,
        outputMint: MOCK_MINTS.USDC,
        amount,
      });

      expect(quote.inputAmount.toString()).toBe(amount.toString());
    });

    it("should throw error when no pool found", async () => {
      mockPoolClient.findPoolsByMints = vi.fn().mockResolvedValue([]);

      await expect(
        swapClient.getQuote({
          inputMint: MOCK_MINTS.SOL,
          outputMint: MOCK_MINTS.CUSTOM_TOKEN,
          amount: 1000000000,
        }),
      ).rejects.toThrow("No pool found for this pair");
    });

    it("should try reverse pool when direct pool not found", async () => {
      mockPoolClient.findPoolsByMints = vi
        .fn()
        .mockResolvedValueOnce([]) // First call returns empty
        .mockResolvedValueOnce([
          {
            address: MOCK_POOLS.SOL_USDC,
            owner: new PublicKey("KeccakSecp256k11111111111111111111111111111"),
            mintA: MOCK_MINTS.USDC,
            mintB: MOCK_MINTS.SOL,
            reserveA: new anchor.BN(1000000),
            reserveB: new anchor.BN(1000000000),
            feeRate: 250,
          },
        ]); // Second call returns reverse pool

      const quote = await swapClient.getQuote({
        inputMint: MOCK_MINTS.SOL,
        outputMint: MOCK_MINTS.USDC,
        amount: 1000000000,
      });

      expect(quote).toBeDefined();
      expect(mockPoolClient.findPoolsByMints).toHaveBeenCalledTimes(2);
    });
  });

  describe("swap", () => {
    it("should execute swap successfully", async () => {
      const result = await swapClient.swap({
        inputMint: MOCK_MINTS.SOL,
        outputMint: MOCK_MINTS.USDC,
        amount: 1000000000,
      });

      expect(result.signature).toBe("mock-signature");
      expect(result.inputAmount).toBeInstanceOf(anchor.BN);
      expect(result.outputAmount).toBeInstanceOf(anchor.BN);
      expect(mockClient.provider.sendAndConfirm).toHaveBeenCalled();
    });

    it("should throw error when wallet not connected", async () => {
      mockClient.isWalletConnected = vi.fn().mockReturnValue(false);

      await expect(
        swapClient.swap({
          inputMint: MOCK_MINTS.SOL,
          outputMint: MOCK_MINTS.USDC,
          amount: 1000000000,
        }),
      ).rejects.toThrow("Wallet not connected");
    });

    it("should apply swap options", async () => {
      await swapClient.swap({
        inputMint: MOCK_MINTS.SOL,
        outputMint: MOCK_MINTS.USDC,
        amount: 1000000000,
        options: {
          slippageBps: 100,
          priorityFee: 10000,
          computeUnits: 200000,
        },
      });

      expect(mockClient.provider.sendAndConfirm).toHaveBeenCalledWith(
        expect.any(Transaction),
        expect.any(Array),
        expect.objectContaining({
          skipPreflight: false,
          commitment: "confirmed",
        }),
      );
    });
  });

  describe("simulateSwap", () => {
    it("should simulate swap successfully", async () => {
      mockClient.connection.simulateTransaction = vi.fn().mockResolvedValue({
        value: { err: null },
      });

      const simulation = await swapClient.simulateSwap({
        inputMint: MOCK_MINTS.SOL,
        outputMint: MOCK_MINTS.USDC,
        amount: 1000000000,
      });

      expect(simulation.success).toBe(true);
      expect(simulation.outputAmount).toBeDefined();
    });

    it("should handle simulation failure", async () => {
      mockClient.connection.simulateTransaction = vi.fn().mockResolvedValue({
        value: { err: { InsufficientFunds: {} } },
      });

      const simulation = await swapClient.simulateSwap({
        inputMint: MOCK_MINTS.SOL,
        outputMint: MOCK_MINTS.USDC,
        amount: 1000000000,
      });

      expect(simulation.success).toBe(false);
      expect(simulation.error).toBeDefined();
    });

    it("should handle simulation exception", async () => {
      mockClient.connection.simulateTransaction = vi
        .fn()
        .mockRejectedValue(new Error("Simulation failed"));

      const simulation = await swapClient.simulateSwap({
        inputMint: MOCK_MINTS.SOL,
        outputMint: MOCK_MINTS.USDC,
        amount: 1000000000,
      });

      expect(simulation.success).toBe(false);
      expect(simulation.error).toBe("Simulation failed");
    });
  });

  describe("buildSwapTransaction", () => {
    it("should build swap transaction", async () => {
      const quote = await swapClient.getQuote({
        inputMint: MOCK_MINTS.SOL,
        outputMint: MOCK_MINTS.USDC,
        amount: 1000000000,
      });

      const tx = await swapClient.buildSwapTransaction(quote);

      expect(tx).toBeInstanceOf(Transaction);
      expect(tx.instructions.length).toBeGreaterThan(0);
    });

    it("should throw error when wallet not connected", async () => {
      mockClient.isWalletConnected = vi.fn().mockReturnValue(false);

      const quote = await swapClient.getQuote({
        inputMint: MOCK_MINTS.SOL,
        outputMint: MOCK_MINTS.USDC,
        amount: 1000000000,
      });

      await expect(swapClient.buildSwapTransaction(quote)).rejects.toThrow(
        "Wallet not connected",
      );
    });

    it("should add priority fee when specified", async () => {
      const quote = await swapClient.getQuote({
        inputMint: MOCK_MINTS.SOL,
        outputMint: MOCK_MINTS.USDC,
        amount: 1000000000,
      });

      const tx = await swapClient.buildSwapTransaction(quote, {
        priorityFee: 10000,
      });

      expect(tx.instructions.length).toBeGreaterThan(1);
    });

    it("should estimate priority fee when auto", async () => {
      mockClient.connection.getRecentPrioritizationFees = vi
        .fn()
        .mockResolvedValue([
          { prioritizationFee: 5000 },
          { prioritizationFee: 10000 },
          { prioritizationFee: 15000 },
        ]);

      const quote = await swapClient.getQuote({
        inputMint: MOCK_MINTS.SOL,
        outputMint: MOCK_MINTS.USDC,
        amount: 1000000000,
      });

      const tx = await swapClient.buildSwapTransaction(quote, {
        priorityFee: "auto",
      });

      expect(tx.instructions.length).toBeGreaterThan(1);
    });
  });
});
