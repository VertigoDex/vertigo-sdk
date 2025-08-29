import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Transaction, TransactionInstruction, SystemProgram, Keypair } from "@solana/web3.js";
import { VertigoClient } from "./VertigoClient";
import { SwapQuote, SwapOptions } from "../types/client";
import { DEFAULT_SLIPPAGE_BPS, MAX_SLIPPAGE_BPS } from "../core/constants";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  createSyncNativeInstruction,
  createCloseAccountInstruction,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { getPoolPda } from "../utils/helpers";

export class SwapClient {
  constructor(private client: VertigoClient) {}

  /**
   * Get a quote for a swap
   */
  async getQuote(params: {
    inputMint: PublicKey;
    outputMint: PublicKey;
    amount: number | anchor.BN;
    slippageBps?: number;
  }): Promise<SwapQuote> {
    const amount = typeof params.amount === "number" 
      ? new anchor.BN(params.amount) 
      : params.amount;
      
    const slippageBps = params.slippageBps ?? DEFAULT_SLIPPAGE_BPS;
    
    if (slippageBps > MAX_SLIPPAGE_BPS) {
      throw new Error(`Slippage too high: ${slippageBps} bps (max: ${MAX_SLIPPAGE_BPS})`);
    }

    // Find pool for the pair
    const pools = await this.client.pools.findPoolsByMints(params.inputMint, params.outputMint);
    
    if (pools.length === 0) {
      // Try reverse
      const reversePools = await this.client.pools.findPoolsByMints(params.outputMint, params.inputMint);
      if (reversePools.length === 0) {
        throw new Error("No pool found for this pair");
      }
      // Use first pool (in production, would select best)
      const pool = reversePools[0];
      return this.calculateQuote(pool, params.outputMint, params.inputMint, amount, slippageBps, true);
    }

    // Use first pool (in production, would select best based on liquidity/fees)
    const pool = pools[0];
    return this.calculateQuote(pool, params.inputMint, params.outputMint, amount, slippageBps, false);
  }

  private async calculateQuote(
    pool: any,
    inputMint: PublicKey,
    outputMint: PublicKey,
    amount: anchor.BN,
    slippageBps: number,
    isReverse: boolean
  ): Promise<SwapQuote> {
    // Determine which side is which
    const isAtoB = pool.mintA.equals(inputMint);
    
    // Get quote from program
    const user = this.client.wallet?.publicKey || PublicKey.default;
    
    try {
      let result;
      
      if (isAtoB) {
        // Buying B with A (quote buy)
        result = await this.client.ammProgram.methods
          .quoteBuy({ amount, limit: new anchor.BN(0) })
          .accounts({
            owner: pool.owner,
            user,
            mintA: pool.mintA,
            mintB: pool.mintB,
          })
          .view();
      } else {
        // Selling B for A (quote sell)
        result = await this.client.ammProgram.methods
          .quoteSell({ amount, limit: new anchor.BN(Number.MAX_SAFE_INTEGER) })
          .accounts({
            owner: pool.owner,
            user,
            mintA: pool.mintA,
            mintB: pool.mintB,
          })
          .view();
      }

      const outputAmount = isAtoB ? result.amountB : result.amountA;
      const fee = result.feeA;
      
      // Calculate minimum received with slippage
      const slippageMultiplier = 10000 - slippageBps;
      const minimumReceived = outputAmount.mul(new anchor.BN(slippageMultiplier)).div(new anchor.BN(10000));
      
      // Calculate price impact (simplified)
      const priceImpact = this.calculatePriceImpact(amount, outputAmount, pool.reserveA, pool.reserveB, isAtoB);

      return {
        inputMint,
        outputMint,
        inputAmount: amount,
        outputAmount,
        fee,
        priceImpact,
        minimumReceived,
        route: [{
          pool: pool.address,
          inputMint,
          outputMint,
          fee: pool.feeRate,
        }],
      };
    } catch (error) {
      console.error("Failed to get quote:", error);
      throw new Error("Failed to calculate quote");
    }
  }

  private calculatePriceImpact(
    inputAmount: anchor.BN,
    outputAmount: anchor.BN,
    reserveA: anchor.BN,
    reserveB: anchor.BN,
    isAtoB: boolean
  ): number {
    // Simplified price impact calculation
    const inputReserve = isAtoB ? reserveA : reserveB;
    const outputReserve = isAtoB ? reserveB : reserveA;
    
    const spotPrice = outputReserve.mul(new anchor.BN(10000)).div(inputReserve);
    const executionPrice = outputAmount.mul(new anchor.BN(10000)).div(inputAmount);
    
    const impact = spotPrice.sub(executionPrice).mul(new anchor.BN(10000)).div(spotPrice);
    
    return Math.abs(impact.toNumber()) / 100; // Convert to percentage
  }

  /**
   * Execute a swap
   */
  async swap(params: {
    inputMint: PublicKey;
    outputMint: PublicKey;
    amount: number | anchor.BN;
    options?: SwapOptions;
  }): Promise<{
    signature: string;
    inputAmount: anchor.BN;
    outputAmount: anchor.BN;
  }> {
    if (!this.client.isWalletConnected()) {
      throw new Error("Wallet not connected");
    }

    const amount = typeof params.amount === "number" 
      ? new anchor.BN(params.amount) 
      : params.amount;

    // Get quote first
    const quote = await this.getQuote({
      inputMint: params.inputMint,
      outputMint: params.outputMint,
      amount,
      slippageBps: params.options?.slippageBps,
    });

    // Build swap transaction
    const tx = await this.buildSwapTransaction(quote, params.options);
    
    // Send transaction
    const signature = await this.client.provider.sendAndConfirm(tx, [], {
      skipPreflight: params.options?.skipPreflight ?? this.client.getConfig().skipPreflight,
      commitment: params.options?.commitment ?? this.client.getConfig().commitment,
    });

    return {
      signature,
      inputAmount: quote.inputAmount,
      outputAmount: quote.outputAmount,
    };
  }

  /**
   * Build swap transaction
   */
  async buildSwapTransaction(
    quote: SwapQuote,
    options?: SwapOptions
  ): Promise<Transaction> {
    if (!this.client.isWalletConnected()) {
      throw new Error("Wallet not connected");
    }

    const user = this.client.wallet!.publicKey;
    const instructions: TransactionInstruction[] = [];
    
    // Handle priority fee
    if (options?.priorityFee) {
      const fee = options.priorityFee === "auto" 
        ? await this.estimatePriorityFee()
        : options.priorityFee;
        
      instructions.push(
        anchor.web3.ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: fee,
        })
      );
    }

    // Handle compute units
    if (options?.computeUnits) {
      instructions.push(
        anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
          units: options.computeUnits,
        })
      );
    }

    // Handle SOL wrapping if needed
    let wrapAccount: Keypair | undefined;
    if (options?.wrapSol && quote.inputMint.equals(NATIVE_MINT)) {
      wrapAccount = Keypair.generate();
      const wrapIxs = await this.createWrapSolInstructions(
        user,
        wrapAccount,
        quote.inputAmount
      );
      instructions.push(...wrapIxs);
    }

    // Get or create token accounts
    const inputTokenAccount = getAssociatedTokenAddressSync(
      quote.inputMint,
      user,
      false,
      TOKEN_PROGRAM_ID
    );
    
    const outputTokenAccount = getAssociatedTokenAddressSync(
      quote.outputMint,
      user,
      false,
      TOKEN_PROGRAM_ID
    );

    // Create output token account if needed
    instructions.push(
      createAssociatedTokenAccountIdempotentInstruction(
        user,
        outputTokenAccount,
        user,
        quote.outputMint,
        TOKEN_PROGRAM_ID
      )
    );

    // Get pool info
    const pool = await this.client.pools.getPool(quote.route[0].pool);
    if (!pool) {
      throw new Error("Pool not found");
    }

    // Determine swap direction
    const isAtoB = pool.mintA.equals(quote.inputMint);

    // Build swap instruction
    if (isAtoB) {
      // Buy operation
      const swapIx = await this.client.ammProgram.methods
        .buy({
          amount: quote.inputAmount,
          limit: quote.minimumReceived,
        })
        .accounts({
          user,
          owner: pool.owner,
          mintA: pool.mintA,
          mintB: pool.mintB,
          userTokenAccountA: inputTokenAccount,
          userTokenAccountB: outputTokenAccount,
          tokenProgramA: TOKEN_PROGRAM_ID,
          tokenProgramB: TOKEN_PROGRAM_ID,
        })
        .instruction();
      
      instructions.push(swapIx);
    } else {
      // Sell operation
      const swapIx = await this.client.ammProgram.methods
        .sell({
          amount: quote.inputAmount,
          limit: quote.minimumReceived,
        })
        .accounts({
          user,
          owner: pool.owner,
          mintA: pool.mintA,
          mintB: pool.mintB,
          userTokenAccountA: outputTokenAccount,
          userTokenAccountB: inputTokenAccount,
          tokenProgramA: TOKEN_PROGRAM_ID,
          tokenProgramB: TOKEN_PROGRAM_ID,
        })
        .instruction();
      
      instructions.push(swapIx);
    }

    // Handle SOL unwrapping if needed
    if (options?.unwrapSol && quote.outputMint.equals(NATIVE_MINT)) {
      instructions.push(
        createCloseAccountInstruction(
          outputTokenAccount,
          user,
          user,
          [],
          TOKEN_PROGRAM_ID
        )
      );
    }

    const tx = new Transaction().add(...instructions);
    return tx;
  }

  /**
   * Create instructions for wrapping SOL
   */
  private async createWrapSolInstructions(
    user: PublicKey,
    wrapAccount: Keypair,
    amount: anchor.BN
  ): Promise<TransactionInstruction[]> {
    const instructions: TransactionInstruction[] = [];
    
    // Create account
    instructions.push(
      SystemProgram.createAccount({
        fromPubkey: user,
        newAccountPubkey: wrapAccount.publicKey,
        lamports: amount.toNumber(),
        space: 165,
        programId: TOKEN_PROGRAM_ID,
      })
    );
    
    // Initialize account
    instructions.push(
      createSyncNativeInstruction(wrapAccount.publicKey, TOKEN_PROGRAM_ID)
    );
    
    return instructions;
  }

  /**
   * Estimate priority fee based on network conditions
   */
  private async estimatePriorityFee(): Promise<number> {
    // In production, this would query recent blocks for fee estimates
    // For now, return a reasonable default
    return 10000; // 0.01 SOL
  }

  /**
   * Simulate a swap without executing
   */
  async simulateSwap(params: {
    inputMint: PublicKey;
    outputMint: PublicKey;
    amount: number | anchor.BN;
    options?: SwapOptions;
  }): Promise<{
    success: boolean;
    outputAmount?: anchor.BN;
    error?: string;
  }> {
    try {
      const quote = await this.getQuote({
        inputMint: params.inputMint,
        outputMint: params.outputMint,
        amount: params.amount,
        slippageBps: params.options?.slippageBps,
      });

      const tx = await this.buildSwapTransaction(quote, params.options);
      
      // Simulate transaction
      const simulation = await this.client.connection.simulateTransaction(tx);
      
      if (simulation.value.err) {
        return {
          success: false,
          error: JSON.stringify(simulation.value.err),
        };
      }

      return {
        success: true,
        outputAmount: quote.outputAmount,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Simulation failed",
      };
    }
  }
}