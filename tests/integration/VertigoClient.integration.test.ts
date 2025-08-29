import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { VertigoClient } from '../../src/client/VertigoClient';
import { setupConnection, setupWallet, DEVNET_CONFIG, fundWallet } from './config';

describe('VertigoClient Integration Tests (Devnet)', () => {
  let connection: Connection;
  let wallet: Keypair;
  let client: VertigoClient;
  
  beforeAll(async () => {
    connection = setupConnection();
    
    try {
      wallet = setupWallet();
    } catch (error) {
      console.warn('No wallet configured, using ephemeral wallet');
      wallet = Keypair.generate();
      await fundWallet(connection, wallet.publicKey);
    }
    
    client = await VertigoClient.load({
      connection,
      wallet,
      network: 'devnet',
    });
  }, DEVNET_CONFIG.TIMEOUTS.TEST);
  
  afterAll(async () => {
    // Cleanup if needed
  });
  
  describe('Initialization', () => {
    it('should initialize client with connection', async () => {
      expect(client).toBeDefined();
      expect(client.connection).toBe(connection);
    });
    
    it('should have wallet configured', async () => {
      expect(client.wallet).toBeDefined();
      expect(client.wallet?.publicKey).toBeInstanceOf(PublicKey);
    });
    
    it('should load programs', async () => {
      expect(client.programs).toBeDefined();
      expect(client.programs.amm).toBeDefined();
    });
    
    it('should initialize sub-clients', async () => {
      expect(client.pools).toBeDefined();
      expect(client.swap).toBeDefined();
      expect(client.factory).toBeDefined();
      expect(client.relay).toBeDefined();
      expect(client.api).toBeDefined();
    });
  });
  
  describe('Read-only initialization', () => {
    it('should create read-only client', async () => {
      const readOnlyClient = await VertigoClient.loadReadOnly({
        connection,
        network: 'devnet',
      });
      
      expect(readOnlyClient).toBeDefined();
      expect(readOnlyClient.wallet).toBeUndefined();
      expect(readOnlyClient.isReadOnly()).toBe(true);
    });
  });
  
  describe('Pool Operations', () => {
    it('should fetch all pools', async () => {
      const pools = await client.pools.getAllPools();
      expect(Array.isArray(pools)).toBe(true);
      
      if (pools.length > 0) {
        const pool = pools[0];
        expect(pool).toHaveProperty('publicKey');
        expect(pool).toHaveProperty('account');
      }
    });
    
    it('should find pools by mints', async () => {
      const solMint = new PublicKey(DEVNET_CONFIG.TOKENS.SOL);
      const usdcMint = new PublicKey(DEVNET_CONFIG.TOKENS.USDC);
      
      const pools = await client.pools.findPoolsByMints(solMint, usdcMint);
      expect(Array.isArray(pools)).toBe(true);
      
      pools.forEach(pool => {
        const mints = [
          pool.account.mintA.toBase58(),
          pool.account.mintB.toBase58(),
        ];
        expect(
          mints.includes(solMint.toBase58()) || 
          mints.includes(usdcMint.toBase58())
        ).toBe(true);
      });
    });
    
    it('should get pool by address', async () => {
      const pools = await client.pools.getAllPools();
      
      if (pools.length > 0) {
        const poolAddress = pools[0].publicKey;
        const pool = await client.pools.getPool(poolAddress);
        
        expect(pool).toBeDefined();
        expect(pool.publicKey.equals(poolAddress)).toBe(true);
      }
    });
  });
  
  describe('Swap Operations', () => {
    it('should calculate swap quote', async () => {
      const pools = await client.pools.getAllPools();
      
      if (pools.length > 0) {
        const pool = pools[0];
        const amountIn = 1000000; // 0.001 token
        
        const quote = await client.swap.getQuote({
          pool: pool.publicKey,
          inputMint: pool.account.mintA,
          outputMint: pool.account.mintB,
          amountIn,
          slippageBps: 100, // 1%
        });
        
        expect(quote).toBeDefined();
        expect(quote.amountIn).toBe(amountIn);
        expect(quote.estimatedAmountOut).toBeGreaterThan(0);
        expect(quote.minimumAmountOut).toBeGreaterThan(0);
        expect(quote.priceImpactPct).toBeGreaterThanOrEqual(0);
      }
    });
    
    it('should find best swap route', async () => {
      const solMint = new PublicKey(DEVNET_CONFIG.TOKENS.SOL);
      const usdcMint = new PublicKey(DEVNET_CONFIG.TOKENS.USDC);
      const amountIn = 1000000;
      
      try {
        const route = await client.swap.findBestRoute({
          inputMint: solMint,
          outputMint: usdcMint,
          amountIn,
          slippageBps: 100,
        });
        
        expect(route).toBeDefined();
        expect(route.inputMint.equals(solMint)).toBe(true);
        expect(route.outputMint.equals(usdcMint)).toBe(true);
        expect(route.estimatedAmountOut).toBeGreaterThan(0);
      } catch (error) {
        // No direct route might exist on devnet
        console.log('No swap route found:', error);
      }
    });
  });
  
  describe('API Operations', () => {
    it('should fetch pool stats', async () => {
      const pools = await client.pools.getAllPools();
      
      if (pools.length > 0) {
        const poolAddress = pools[0].publicKey.toBase58();
        
        try {
          const stats = await client.api.getPoolStats(poolAddress);
          expect(stats).toBeDefined();
          expect(stats.poolAddress).toBe(poolAddress);
        } catch (error) {
          // API might not have devnet data
          console.log('API stats not available for devnet pool');
        }
      }
    });
    
    it('should fetch token price', async () => {
      const solMint = DEVNET_CONFIG.TOKENS.SOL;
      
      try {
        const price = await client.api.getTokenPrice(solMint);
        expect(price).toBeDefined();
        expect(price.mint).toBe(solMint);
        expect(price.price).toBeGreaterThan(0);
      } catch (error) {
        // API might not have devnet prices
        console.log('API price not available for devnet token');
      }
    });
  });
  
  describe('Factory Operations', () => {
    it('should get factory state', async () => {
      const factoryState = await client.factory.getFactoryState();
      
      if (factoryState) {
        expect(factoryState).toHaveProperty('tokensCreated');
        expect(factoryState).toHaveProperty('authority');
      }
    });
    
    it('should validate token metadata', () => {
      const metadata = {
        name: 'Test Token',
        symbol: 'TEST',
        description: 'A test token',
        image: 'https://example.com/image.png',
        twitter: 'https://twitter.com/test',
        telegram: 'https://t.me/test',
        website: 'https://example.com',
      };
      
      const isValid = client.factory.validateMetadata(metadata);
      expect(isValid).toBe(true);
    });
  });
  
  describe('Error Handling', () => {
    it('should handle invalid pool address', async () => {
      const invalidAddress = Keypair.generate().publicKey;
      
      await expect(
        client.pools.getPool(invalidAddress)
      ).rejects.toThrow();
    });
    
    it('should handle invalid swap parameters', async () => {
      const invalidMint = Keypair.generate().publicKey;
      
      await expect(
        client.swap.findBestRoute({
          inputMint: invalidMint,
          outputMint: invalidMint,
          amountIn: 1000000,
          slippageBps: 100,
        })
      ).rejects.toThrow();
    });
  });
  
  describe('Transaction Building (Simulation Only)', () => {
    it('should build swap transaction', async () => {
      const pools = await client.pools.getAllPools();
      
      if (pools.length > 0 && wallet) {
        const pool = pools[0];
        
        const swapTx = await client.swap.createSwapTransaction({
          pool: pool.publicKey,
          inputMint: pool.account.mintA,
          outputMint: pool.account.mintB,
          amountIn: 1000000,
          slippageBps: 100,
          userPublicKey: wallet.publicKey,
        });
        
        expect(swapTx).toBeDefined();
        expect(swapTx.instructions.length).toBeGreaterThan(0);
        
        // Simulate only, don't execute
        const simulation = await connection.simulateTransaction(swapTx);
        expect(simulation.value.err).toBeNull();
      }
    });
  });
});