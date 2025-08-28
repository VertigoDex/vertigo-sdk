import { PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { Network, API_ENDPOINTS, VERTIGO_API_VERSION } from "../core/constants";

export type PoolStats = {
  address: string;
  mintA: string;
  mintB: string;
  tvl: number;
  volume24h: number;
  volume7d: number;
  fees24h: number;
  fees7d: number;
  apy: number;
  priceUsd: number;
  priceChange24h: number;
  transactions24h: number;
};

export type TokenInfo = {
  mint: string;
  name: string;
  symbol: string;
  decimals: number;
  supply: string;
  priceUsd?: number;
  logoUri?: string;
  coingeckoId?: string;
};

export type SwapRoute = {
  inputMint: string;
  outputMint: string;
  inputAmount: string;
  outputAmount: string;
  pools: Array<{
    address: string;
    fee: number;
  }>;
  priceImpact: number;
};

export type MarketData = {
  totalTvl: number;
  totalVolume24h: number;
  totalPools: number;
  topPools: PoolStats[];
};

export class VertigoAPI {
  private baseUrl: string;
  private network: Network;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTtl: number = 60000; // 1 minute default

  constructor(network: Network = "mainnet", customUrl?: string) {
    this.network = network;
    this.baseUrl = customUrl || API_ENDPOINTS[network];
  }

  /**
   * Set cache TTL in milliseconds
   */
  setCacheTtl(ttl: number): void {
    this.cacheTtl = ttl;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Fetch with caching
   */
  private async fetchWithCache<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const cacheKey = `${endpoint}:${JSON.stringify(options?.body || {})}`;
    
    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTtl) {
      return cached.data;
    }

    // Fetch from API
    const url = `${this.baseUrl}/${VERTIGO_API_VERSION}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Update cache
    this.cache.set(cacheKey, { data, timestamp: Date.now() });
    
    return data;
  }

  /**
   * Get pool statistics
   */
  async getPoolStats(poolAddress: string | PublicKey): Promise<PoolStats> {
    const address = typeof poolAddress === "string" ? poolAddress : poolAddress.toBase58();
    return this.fetchWithCache<PoolStats>(`/pools/${address}/stats`);
  }

  /**
   * Get multiple pool statistics
   */
  async getMultiplePoolStats(poolAddresses: (string | PublicKey)[]): Promise<PoolStats[]> {
    const addresses = poolAddresses.map(addr => 
      typeof addr === "string" ? addr : addr.toBase58()
    );
    
    return this.fetchWithCache<PoolStats[]>("/pools/stats", {
      method: "POST",
      body: JSON.stringify({ addresses }),
    });
  }

  /**
   * Get pools by token mints
   */
  async getPoolsByMints(
    mintA?: string | PublicKey,
    mintB?: string | PublicKey,
    options?: {
      sortBy?: "tvl" | "volume24h" | "apy";
      limit?: number;
      offset?: number;
    }
  ): Promise<PoolStats[]> {
    const params = new URLSearchParams();
    
    if (mintA) {
      params.append("mintA", typeof mintA === "string" ? mintA : mintA.toBase58());
    }
    if (mintB) {
      params.append("mintB", typeof mintB === "string" ? mintB : mintB.toBase58());
    }
    if (options?.sortBy) {
      params.append("sortBy", options.sortBy);
    }
    if (options?.limit) {
      params.append("limit", options.limit.toString());
    }
    if (options?.offset) {
      params.append("offset", options.offset.toString());
    }

    return this.fetchWithCache<PoolStats[]>(`/pools?${params.toString()}`);
  }

  /**
   * Get swap quote from API
   */
  async getSwapQuote(params: {
    inputMint: string | PublicKey;
    outputMint: string | PublicKey;
    amount: string | number | anchor.BN;
    slippageBps?: number;
    userAddress?: string | PublicKey;
  }): Promise<SwapRoute> {
    const body = {
      inputMint: typeof params.inputMint === "string" 
        ? params.inputMint 
        : params.inputMint.toBase58(),
      outputMint: typeof params.outputMint === "string" 
        ? params.outputMint 
        : params.outputMint.toBase58(),
      amount: params.amount.toString(),
      slippageBps: params.slippageBps || 50,
      userAddress: params.userAddress 
        ? (typeof params.userAddress === "string" 
          ? params.userAddress 
          : params.userAddress.toBase58())
        : undefined,
    };

    return this.fetchWithCache<SwapRoute>("/swap/quote", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  /**
   * Get token information
   */
  async getTokenInfo(mint: string | PublicKey): Promise<TokenInfo> {
    const address = typeof mint === "string" ? mint : mint.toBase58();
    return this.fetchWithCache<TokenInfo>(`/tokens/${address}`);
  }

  /**
   * Get multiple token information
   */
  async getMultipleTokenInfo(mints: (string | PublicKey)[]): Promise<TokenInfo[]> {
    const addresses = mints.map(mint => 
      typeof mint === "string" ? mint : mint.toBase58()
    );
    
    return this.fetchWithCache<TokenInfo[]>("/tokens", {
      method: "POST",
      body: JSON.stringify({ mints: addresses }),
    });
  }

  /**
   * Get market overview data
   */
  async getMarketData(): Promise<MarketData> {
    return this.fetchWithCache<MarketData>("/market/overview");
  }

  /**
   * Get price history for a pool
   */
  async getPriceHistory(
    poolAddress: string | PublicKey,
    interval: "5m" | "1h" | "4h" | "1d" | "1w" = "1h",
    limit: number = 100
  ): Promise<Array<{
    timestamp: number;
    price: number;
    volume: number;
  }>> {
    const address = typeof poolAddress === "string" ? poolAddress : poolAddress.toBase58();
    const params = new URLSearchParams({
      interval,
      limit: limit.toString(),
    });

    return this.fetchWithCache(`/pools/${address}/history?${params.toString()}`);
  }

  /**
   * Get transaction history for a pool
   */
  async getPoolTransactions(
    poolAddress: string | PublicKey,
    options?: {
      limit?: number;
      offset?: number;
      type?: "swap" | "add" | "remove" | "all";
    }
  ): Promise<Array<{
    signature: string;
    timestamp: number;
    type: string;
    user: string;
    inputMint: string;
    outputMint: string;
    inputAmount: string;
    outputAmount: string;
    fee: string;
  }>> {
    const address = typeof poolAddress === "string" ? poolAddress : poolAddress.toBase58();
    const params = new URLSearchParams();
    
    if (options?.limit) {
      params.append("limit", options.limit.toString());
    }
    if (options?.offset) {
      params.append("offset", options.offset.toString());
    }
    if (options?.type && options.type !== "all") {
      params.append("type", options.type);
    }

    return this.fetchWithCache(`/pools/${address}/transactions?${params.toString()}`);
  }

  /**
   * Get user portfolio
   */
  async getUserPortfolio(userAddress: string | PublicKey): Promise<{
    totalValueUsd: number;
    pools: Array<{
      poolAddress: string;
      lpTokenBalance: string;
      valueUsd: number;
      share: number;
    }>;
    claimableRewards: Array<{
      poolAddress: string;
      tokenMint: string;
      amount: string;
      valueUsd: number;
    }>;
  }> {
    const address = typeof userAddress === "string" ? userAddress : userAddress.toBase58();
    return this.fetchWithCache(`/users/${address}/portfolio`);
  }

  /**
   * Search tokens by name or symbol
   */
  async searchTokens(query: string): Promise<TokenInfo[]> {
    const params = new URLSearchParams({ q: query });
    return this.fetchWithCache<TokenInfo[]>(`/tokens/search?${params.toString()}`);
  }

  /**
   * Get trending pools
   */
  async getTrendingPools(
    timeframe: "1h" | "24h" | "7d" = "24h",
    limit: number = 10
  ): Promise<PoolStats[]> {
    const params = new URLSearchParams({
      timeframe,
      limit: limit.toString(),
    });
    
    return this.fetchWithCache<PoolStats[]>(`/pools/trending?${params.toString()}`);
  }

  /**
   * Get new pools
   */
  async getNewPools(limit: number = 10): Promise<PoolStats[]> {
    const params = new URLSearchParams({
      limit: limit.toString(),
    });
    
    return this.fetchWithCache<PoolStats[]>(`/pools/new?${params.toString()}`);
  }

  /**
   * Subscribe to pool events via WebSocket
   */
  subscribeToPool(
    poolAddress: string | PublicKey,
    callbacks: {
      onSwap?: (data: any) => void;
      onLiquidityChange?: (data: any) => void;
      onPriceUpdate?: (data: any) => void;
      onError?: (error: any) => void;
    }
  ): () => void {
    const address = typeof poolAddress === "string" ? poolAddress : poolAddress.toBase58();
    const wsUrl = this.baseUrl.replace("https://", "wss://").replace("http://", "ws://");
    const ws = new WebSocket(`${wsUrl}/ws/pools/${address}`);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case "swap":
            callbacks.onSwap?.(data);
            break;
          case "liquidity":
            callbacks.onLiquidityChange?.(data);
            break;
          case "price":
            callbacks.onPriceUpdate?.(data);
            break;
        }
      } catch (error) {
        callbacks.onError?.(error);
      }
    };

    ws.onerror = (error) => {
      callbacks.onError?.(error);
    };

    // Return cleanup function
    return () => {
      ws.close();
    };
  }
}