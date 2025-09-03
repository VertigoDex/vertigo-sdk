import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { VertigoAPI } from "../../../src/api/VertigoAPI";
import { MOCK_POOLS, MOCK_MINTS } from "../../mocks/programs";

describe("VertigoAPI", () => {
  let api: VertigoAPI;
  let fetchMock: any;

  beforeEach(() => {
    api = new VertigoAPI("mainnet");

    // Mock global fetch
    fetchMock = vi.fn();
    global.fetch = fetchMock;

    // Default successful response
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({}),
      statusText: "OK",
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    api.clearCache();
  });

  describe("initialization", () => {
    it("should initialize with mainnet by default", () => {
      const api = new VertigoAPI();
      expect(api).toBeDefined();
    });

    it("should initialize with custom URL", () => {
      const customUrl = "https://custom-api.vertigo.so";
      const api = new VertigoAPI("mainnet", customUrl);
      expect(api).toBeDefined();
    });

    it("should set cache TTL", () => {
      api.setCacheTtl(30000);
      expect(api).toBeDefined();
    });
  });

  describe("getPoolStats", () => {
    it("should fetch pool statistics", async () => {
      const mockStats = {
        address: MOCK_POOLS.SOL_USDC.toBase58(),
        mintA: MOCK_MINTS.SOL.toBase58(),
        mintB: MOCK_MINTS.USDC.toBase58(),
        tvl: 1000000,
        volume24h: 500000,
        apy: 25.5,
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockStats),
      });

      const stats = await api.getPoolStats(MOCK_POOLS.SOL_USDC);

      expect(stats).toEqual(mockStats);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining(
          `/pools/${MOCK_POOLS.SOL_USDC.toBase58()}/stats`,
        ),
        expect.any(Object),
      );
    });

    it("should accept string address", async () => {
      const address = MOCK_POOLS.SOL_USDC.toBase58();
      await api.getPoolStats(address);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining(`/pools/${address}/stats`),
        expect.any(Object),
      );
    });

    it("should throw error on API failure", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        statusText: "Not Found",
      });

      await expect(api.getPoolStats(MOCK_POOLS.SOL_USDC)).rejects.toThrow(
        "API request failed: Not Found",
      );
    });
  });

  describe("getSwapQuote", () => {
    it("should fetch swap quote", async () => {
      const mockQuote = {
        inputMint: MOCK_MINTS.SOL.toBase58(),
        outputMint: MOCK_MINTS.USDC.toBase58(),
        inputAmount: "1000000000",
        outputAmount: "990000",
        priceImpact: 0.5,
        pools: [],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockQuote),
      });

      const quote = await api.getSwapQuote({
        inputMint: MOCK_MINTS.SOL,
        outputMint: MOCK_MINTS.USDC,
        amount: 1000000000,
      });

      expect(quote).toEqual(mockQuote);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/swap/quote"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining(MOCK_MINTS.SOL.toBase58()),
        }),
      );
    });

    it("should handle BN amounts", async () => {
      await api.getSwapQuote({
        inputMint: MOCK_MINTS.SOL,
        outputMint: MOCK_MINTS.USDC,
        amount: new anchor.BN(1000000000),
      });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining("1000000000"),
        }),
      );
    });

    it("should include user address when provided", async () => {
      const userAddress = new PublicKey(
        "Cv7YDGM6g8fP3LdZDpnQmF9F4XoWfDBwMcj9HrT27kKj",
      );

      await api.getSwapQuote({
        inputMint: MOCK_MINTS.SOL,
        outputMint: MOCK_MINTS.USDC,
        amount: 1000000000,
        userAddress,
      });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining(userAddress.toBase58()),
        }),
      );
    });
  });

  describe("caching", () => {
    it("should cache responses", async () => {
      const mockStats = { tvl: 1000000 };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockStats),
      });

      // First call - should fetch
      const stats1 = await api.getPoolStats(MOCK_POOLS.SOL_USDC);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const stats2 = await api.getPoolStats(MOCK_POOLS.SOL_USDC);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      expect(stats1).toEqual(stats2);
    });

    it("should respect cache TTL", async () => {
      api.setCacheTtl(100); // 100ms TTL

      const mockStats = { tvl: 1000000 };

      fetchMock.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockStats),
      });

      // First call
      await api.getPoolStats(MOCK_POOLS.SOL_USDC);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Wait for cache to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Second call - should fetch again
      await api.getPoolStats(MOCK_POOLS.SOL_USDC);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("should clear cache", async () => {
      const mockStats = { tvl: 1000000 };

      fetchMock.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockStats),
      });

      // First call
      await api.getPoolStats(MOCK_POOLS.SOL_USDC);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Clear cache
      api.clearCache();

      // Second call - should fetch again
      await api.getPoolStats(MOCK_POOLS.SOL_USDC);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe("getPoolsByMints", () => {
    it("should fetch pools by mints", async () => {
      const mockPools = [{ address: MOCK_POOLS.SOL_USDC.toBase58() }];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockPools),
      });

      const pools = await api.getPoolsByMints(MOCK_MINTS.SOL, MOCK_MINTS.USDC);

      expect(pools).toEqual(mockPools);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/pools?"),
        expect.any(Object),
      );
    });

    it("should include sort and pagination options", async () => {
      await api.getPoolsByMints(MOCK_MINTS.SOL, undefined, {
        sortBy: "tvl",
        limit: 10,
        offset: 20,
      });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("sortBy=tvl"),
        expect.any(Object),
      );
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("limit=10"),
        expect.any(Object),
      );
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("offset=20"),
        expect.any(Object),
      );
    });
  });

  describe("getTrendingPools", () => {
    it("should fetch trending pools", async () => {
      const mockPools = [
        { address: MOCK_POOLS.SOL_USDC.toBase58(), tvl: 1000000 },
      ];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockPools),
      });

      const pools = await api.getTrendingPools("24h", 5);

      expect(pools).toEqual(mockPools);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/pools/trending?timeframe=24h&limit=5"),
        expect.any(Object),
      );
    });
  });

  describe("subscribeToPool", () => {
    it("should create WebSocket subscription", () => {
      const callbacks = {
        onSwap: vi.fn(),
        onPriceUpdate: vi.fn(),
        onError: vi.fn(),
      };

      const unsubscribe = api.subscribeToPool(MOCK_POOLS.SOL_USDC, callbacks);

      expect(unsubscribe).toBeTypeOf("function");
      expect(WebSocket).toHaveBeenCalledWith(
        expect.stringContaining(`/ws/pools/${MOCK_POOLS.SOL_USDC.toBase58()}`),
      );
    });

    it("should handle WebSocket messages", () => {
      const callbacks = {
        onSwap: vi.fn(),
        onPriceUpdate: vi.fn(),
        onError: vi.fn(),
      };

      api.subscribeToPool(MOCK_POOLS.SOL_USDC, callbacks);

      const ws = (WebSocket as any).mock.results[0].value;

      // Simulate swap message
      ws.onmessage({ data: JSON.stringify({ type: "swap", data: {} }) });
      expect(callbacks.onSwap).toHaveBeenCalled();

      // Simulate price message
      ws.onmessage({ data: JSON.stringify({ type: "price", data: {} }) });
      expect(callbacks.onPriceUpdate).toHaveBeenCalled();
    });

    it("should handle WebSocket errors", () => {
      const callbacks = {
        onError: vi.fn(),
      };

      api.subscribeToPool(MOCK_POOLS.SOL_USDC, callbacks);

      const ws = (WebSocket as any).mock.results[0].value;

      // Simulate error event
      ws.onerror({ type: "error" });
      expect(callbacks.onError).toHaveBeenCalledWith(
        new Error("WebSocket error: error"),
      );
    });

    it("should close WebSocket on unsubscribe", () => {
      const unsubscribe = api.subscribeToPool(MOCK_POOLS.SOL_USDC, {});
      const ws = (WebSocket as any).mock.results[0].value;

      unsubscribe();

      expect(ws.close).toHaveBeenCalled();
    });
  });
});
