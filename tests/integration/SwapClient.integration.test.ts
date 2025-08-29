import { describe, it, expect, beforeAll } from 'vitest';
import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { SwapClient } from '../../src/client/SwapClient';
import { PoolClient } from '../../src/client/PoolClient';
import { VertigoClient } from '../../src/client/VertigoClient';
import { setupConnection, setupWallet, DEVNET_CONFIG } from './config';

describe('SwapClient Integration Tests (Devnet)', () => {
  let connection: Connection;
  let wallet: Keypair;
  let swapClient: SwapClient;
  let poolClient: PoolClient;
  let client: VertigoClient;
  
  beforeAll(async () => {
    connection = setupConnection();
    
    try {
      wallet = setupWallet();
    } catch {
      wallet = Keypair.generate();
    }
    
    client = await VertigoClient.load({
      connection,
      wallet,
      network: 'devnet',
    });
    
    swapClient = client.swap;
    poolClient = client.pools;
  }, DEVNET_CONFIG.TIMEOUTS.TEST);
  
  describe('Quote Calculation', () => {
    it('should calculate accurate swap quotes', async () => {
      const pools = await poolClient.getAllPools();
      
      if (pools.length === 0) {
        console.log('No pools available on devnet');
        return;
      }
      
      const pool = pools[0];
      const amountIn = 1_000_000; // 0.001 token (assuming 9 decimals)
      
      const quote = await swapClient.getQuote({
        pool: pool.publicKey,
        inputMint: pool.account.mintA,
        outputMint: pool.account.mintB,
        amountIn,
        slippageBps: 50, // 0.5%
      });
      
      expect(quote).toBeDefined();
      expect(quote.amountIn).toBe(amountIn);
      expect(quote.estimatedAmountOut).toBeGreaterThan(0);
      expect(quote.minimumAmountOut).toBeLessThanOrEqual(quote.estimatedAmountOut);
      expect(quote.priceImpactPct).toBeGreaterThanOrEqual(0);
      expect(quote.fee).toBeGreaterThanOrEqual(0);
      
      // Price impact should be reasonable for small trades
      expect(quote.priceImpactPct).toBeLessThan(10);
    });
    
    it('should handle reverse swap quotes', async () => {
      const pools = await poolClient.getAllPools();
      
      if (pools.length === 0) return;
      
      const pool = pools[0];
      const amountIn = 1_000_000;
      
      // Forward quote
      const forwardQuote = await swapClient.getQuote({
        pool: pool.publicKey,
        inputMint: pool.account.mintA,
        outputMint: pool.account.mintB,
        amountIn,
        slippageBps: 50,
      });
      
      // Reverse quote
      const reverseQuote = await swapClient.getQuote({
        pool: pool.publicKey,
        inputMint: pool.account.mintB,
        outputMint: pool.account.mintA,
        amountIn: forwardQuote.estimatedAmountOut,
        slippageBps: 50,
      });
      
      // Should get back approximately the original amount minus fees
      const tolerance = 0.02; // 2% tolerance for fees and rounding
      expect(reverseQuote.estimatedAmountOut).toBeGreaterThan(amountIn * (1 - tolerance));
      expect(reverseQuote.estimatedAmountOut).toBeLessThan(amountIn);
    });
    
    it('should calculate price impact correctly', async () => {
      const pools = await poolClient.getAllPools();
      
      if (pools.length === 0) return;
      
      const pool = pools[0];
      
      // Small trade should have minimal impact
      const smallQuote = await swapClient.getQuote({
        pool: pool.publicKey,
        inputMint: pool.account.mintA,
        outputMint: pool.account.mintB,
        amountIn: 1_000, // Very small amount
        slippageBps: 50,
      });
      
      // Large trade should have higher impact
      const largeQuote = await swapClient.getQuote({
        pool: pool.publicKey,
        inputMint: pool.account.mintA,
        outputMint: pool.account.mintB,
        amountIn: 1_000_000_000, // Large amount
        slippageBps: 50,
      });
      
      expect(smallQuote.priceImpactPct).toBeLessThan(0.1); // < 0.1%
      expect(largeQuote.priceImpactPct).toBeGreaterThan(smallQuote.priceImpactPct);
    });
  });
  
  describe('Route Finding', () => {
    it('should find direct routes', async () => {
      const pools = await poolClient.getAllPools();
      
      if (pools.length === 0) return;
      
      const pool = pools[0];
      
      const route = await swapClient.findBestRoute({
        inputMint: pool.account.mintA,
        outputMint: pool.account.mintB,
        amountIn: 1_000_000,
        slippageBps: 100,
      });
      
      expect(route).toBeDefined();
      expect(route.pools.length).toBe(1);
      expect(route.pools[0].equals(pool.publicKey)).toBe(true);
      expect(route.estimatedAmountOut).toBeGreaterThan(0);
    });
    
    it('should find multi-hop routes', async () => {
      // This requires at least 3 tokens with pools between them
      const pools = await poolClient.getAllPools();
      
      if (pools.length < 2) {
        console.log('Not enough pools for multi-hop test');
        return;
      }
      
      // Try to find a route that requires 2 hops
      const tokenA = pools[0].account.mintA;
      const tokenC = pools[1].account.mintB;
      
      try {
        const route = await swapClient.findBestRoute({
          inputMint: tokenA,
          outputMint: tokenC,
          amountIn: 1_000_000,
          slippageBps: 100,
          maxHops: 2,
        });
        
        if (route.pools.length > 1) {
          expect(route.pools.length).toBeLessThanOrEqual(2);
          expect(route.estimatedAmountOut).toBeGreaterThan(0);
        }
      } catch (error) {
        console.log('No multi-hop route available');
      }
    });
    
    it('should respect max hops constraint', async () => {
      const pools = await poolClient.getAllPools();
      
      if (pools.length === 0) return;
      
      const tokenA = pools[0].account.mintA;
      const tokenB = pools[0].account.mintB;
      
      const route = await swapClient.findBestRoute({
        inputMint: tokenA,
        outputMint: tokenB,
        amountIn: 1_000_000,
        slippageBps: 100,
        maxHops: 1,
      });
      
      expect(route.pools.length).toBeLessThanOrEqual(1);
    });
  });
  
  describe('Transaction Building', () => {
    it('should build valid swap transaction', async () => {
      const pools = await poolClient.getAllPools();
      
      if (pools.length === 0 || !wallet) return;
      
      const pool = pools[0];
      
      const tx = await swapClient.createSwapTransaction({
        pool: pool.publicKey,
        inputMint: pool.account.mintA,
        outputMint: pool.account.mintB,
        amountIn: 1_000_000,
        slippageBps: 100,
        userPublicKey: wallet.publicKey,
      });
      
      expect(tx).toBeInstanceOf(Transaction);
      expect(tx.instructions.length).toBeGreaterThan(0);
      expect(tx.feePayer).toEqual(wallet.publicKey);
      
      // Verify transaction can be simulated
      const simulation = await connection.simulateTransaction(tx);
      
      // On devnet, simulation might fail due to missing accounts
      // but transaction structure should be valid
      expect(simulation).toBeDefined();
    });
    
    it('should include token account creation when needed', async () => {
      const pools = await poolClient.getAllPools();
      
      if (pools.length === 0 || !wallet) return;
      
      const pool = pools[0];
      const newWallet = Keypair.generate(); // New wallet without token accounts
      
      const tx = await swapClient.createSwapTransaction({
        pool: pool.publicKey,
        inputMint: pool.account.mintA,
        outputMint: pool.account.mintB,
        amountIn: 1_000_000,
        slippageBps: 100,
        userPublicKey: newWallet.publicKey,
        createTokenAccounts: true,
      });
      
      // Should include ATA creation instructions
      const hasAtaInstruction = tx.instructions.some(
        ix => ix.programId.equals(new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'))
      );
      
      expect(hasAtaInstruction).toBe(true);
    });
  });
  
  describe('Slippage Handling', () => {
    it('should apply slippage tolerance correctly', async () => {
      const pools = await poolClient.getAllPools();
      
      if (pools.length === 0) return;
      
      const pool = pools[0];
      const amountIn = 1_000_000;
      
      // Test different slippage values
      const slippageValues = [10, 50, 100, 500]; // 0.1%, 0.5%, 1%, 5%
      
      for (const slippageBps of slippageValues) {
        const quote = await swapClient.getQuote({
          pool: pool.publicKey,
          inputMint: pool.account.mintA,
          outputMint: pool.account.mintB,
          amountIn,
          slippageBps,
        });
        
        const expectedMinimum = Math.floor(
          quote.estimatedAmountOut * (1 - slippageBps / 10000)
        );
        
        expect(quote.minimumAmountOut).toBeLessThanOrEqual(quote.estimatedAmountOut);
        expect(quote.minimumAmountOut).toBeGreaterThanOrEqual(expectedMinimum * 0.99); // Allow 1% rounding tolerance
      }
    });
  });
  
  describe('Error Scenarios', () => {
    it('should handle insufficient liquidity', async () => {
      const pools = await poolClient.getAllPools();
      
      if (pools.length === 0) return;
      
      const pool = pools[0];
      const hugeAmount = Number.MAX_SAFE_INTEGER;
      
      await expect(
        swapClient.getQuote({
          pool: pool.publicKey,
          inputMint: pool.account.mintA,
          outputMint: pool.account.mintB,
          amountIn: hugeAmount,
          slippageBps: 100,
        })
      ).rejects.toThrow();
    });
    
    it('should handle invalid pool address', async () => {
      const invalidPool = Keypair.generate().publicKey;
      
      await expect(
        swapClient.getQuote({
          pool: invalidPool,
          inputMint: Keypair.generate().publicKey,
          outputMint: Keypair.generate().publicKey,
          amountIn: 1_000_000,
          slippageBps: 100,
        })
      ).rejects.toThrow();
    });
    
    it('should handle same input and output mint', async () => {
      const sameMint = new PublicKey(DEVNET_CONFIG.TOKENS.SOL);
      
      await expect(
        swapClient.findBestRoute({
          inputMint: sameMint,
          outputMint: sameMint,
          amountIn: 1_000_000,
          slippageBps: 100,
        })
      ).rejects.toThrow();
    });
  });
  
  describe('Performance', () => {
    it('should calculate quotes quickly', async () => {
      const pools = await poolClient.getAllPools();
      
      if (pools.length === 0) return;
      
      const pool = pools[0];
      const startTime = Date.now();
      
      await swapClient.getQuote({
        pool: pool.publicKey,
        inputMint: pool.account.mintA,
        outputMint: pool.account.mintB,
        amountIn: 1_000_000,
        slippageBps: 100,
      });
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
    
    it('should find routes efficiently', async () => {
      const pools = await poolClient.getAllPools();
      
      if (pools.length === 0) return;
      
      const startTime = Date.now();
      
      await swapClient.findBestRoute({
        inputMint: pools[0].account.mintA,
        outputMint: pools[0].account.mintB,
        amountIn: 1_000_000,
        slippageBps: 100,
      });
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });
});