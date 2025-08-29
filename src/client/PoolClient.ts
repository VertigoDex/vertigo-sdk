import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair, Transaction, TransactionInstruction } from "@solana/web3.js";
import { VertigoClient } from "./VertigoClient";
import { PoolData, TransactionOptions } from "../types/client";
import { getPoolPda } from "../utils/helpers";
import { CreateRequest } from "../types/generated/amm";
import { 
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID
} from "@solana/spl-token";

export class PoolClient {
  constructor(private client: VertigoClient) {}

  /**
   * Get pool address from parameters
   */
  getPoolAddress(
    owner: PublicKey,
    mintA: PublicKey,
    mintB: PublicKey
  ): PublicKey {
    const [pool] = getPoolPda(
      owner,
      mintA,
      mintB,
      this.client.ammProgram.programId
    );
    return pool;
  }

  /**
   * Fetch pool data from chain
   */
  async getPool(poolAddress: PublicKey): Promise<PoolData | null> {
    try {
      const poolAccount = await this.client.ammProgram.account.pool.fetch(poolAddress);
      
      return {
        address: poolAddress,
        owner: poolAccount.owner,
        mintA: poolAccount.mintA,
        mintB: poolAccount.mintB,
        reserveA: poolAccount.virtualReserveA,
        reserveB: poolAccount.virtualReserveB,
        totalSupply: poolAccount.virtualReserveA.add(poolAccount.virtualReserveB),
        feeRate: poolAccount.feeParams.royaltiesBps,
      };
    } catch (error) {
      console.error("Failed to fetch pool:", error);
      return null;
    }
  }

  /**
   * Fetch multiple pools efficiently
   */
  async getPools(poolAddresses: PublicKey[]): Promise<(PoolData | null)[]> {
    try {
      const poolAccounts = await this.client.ammProgram.account.pool.fetchMultiple(poolAddresses);
      
      return poolAccounts.map((account, index) => {
        if (!account) return null;
        
        return {
          address: poolAddresses[index],
          owner: account.owner,
          mintA: account.mintA,
          mintB: account.mintB,
          reserveA: account.virtualReserveA,
          reserveB: account.virtualReserveB,
          totalSupply: account.virtualReserveA.add(account.virtualReserveB),
          feeRate: account.feeParams.royaltiesBps,
        };
      });
    } catch (error) {
      console.error("Failed to fetch pools:", error);
      return poolAddresses.map(() => null);
    }
  }

  /**
   * Find pools by mints
   */
  async findPoolsByMints(
    mintA: PublicKey,
    mintB?: PublicKey
  ): Promise<PoolData[]> {
    const filters: any[] = [
      {
        memcmp: {
          offset: 8 + 32, // After discriminator and owner
          bytes: mintA.toBase58(),
        },
      },
    ];

    if (mintB) {
      filters.push({
        memcmp: {
          offset: 8 + 32 + 32, // After discriminator, owner, and mintA
          bytes: mintB.toBase58(),
        },
      });
    }

    const pools = await this.client.ammProgram.account.pool.all(filters);
    
    return pools.map((pool) => ({
      address: pool.publicKey,
      owner: pool.account.owner,
      mintA: pool.account.mintA,
      mintB: pool.account.mintB,
      reserveA: pool.account.virtualReserveA,
      reserveB: pool.account.virtualReserveB,
      totalSupply: pool.account.virtualReserveA.add(pool.account.virtualReserveB),
      feeRate: pool.account.feeParams.royaltiesBps,
    }));
  }

  /**
   * Create a new pool with simplified interface
   */
  async createPool(
    params: {
      mintA: PublicKey;
      mintB: PublicKey;
      initialMarketCap: number; // in lamports/smallest unit
      royaltiesBps: number;
      launchTime?: anchor.BN;
      privilegedSwapper?: PublicKey;
    },
    options?: TransactionOptions
  ): Promise<{
    signature: string;
    poolAddress: PublicKey;
  }> {
    if (!this.client.isWalletConnected()) {
      throw new Error("Wallet not connected");
    }

    const owner = Keypair.generate();
    const tokenWalletAuthority = Keypair.generate();
    const payer = this.client.wallet!.publicKey;

    // Calculate pool parameters
    const shift = new anchor.BN(params.initialMarketCap);
    const initialTokenBReserves = new anchor.BN(1_000_000_000); // Default initial reserves

    // Get or create token wallet for mintB
    const tokenWalletB = getAssociatedTokenAddressSync(
      params.mintB,
      tokenWalletAuthority.publicKey,
      true,
      params.mintB.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID
    );

    const createRequest: CreateRequest = {
      params: {
        shift,
        initialTokenBReserves,
        feeParams: {
          normalizationPeriod: new anchor.BN(3600), // 1 hour default
          decay: 0.99,
          royaltiesBps: params.royaltiesBps,
          privilegedSwapper: params.privilegedSwapper,
          reference: params.launchTime || new anchor.BN(Math.floor(Date.now() / 1000)),
        },
      },
      payer: this.client.wallet as any,
      owner,
      tokenWalletAuthority,
      tokenWalletB,
      mintA: params.mintA,
      mintB: params.mintB,
      tokenProgramA: TOKEN_PROGRAM_ID,
      tokenProgramB: params.mintB.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID,
    };

    const instructions: TransactionInstruction[] = [];

    // Create associated token account if needed
    instructions.push(
      createAssociatedTokenAccountIdempotentInstruction(
        payer,
        tokenWalletB,
        tokenWalletAuthority.publicKey,
        params.mintB,
        createRequest.tokenProgramB
      )
    );

    // Create pool instruction
    const createIx = await this.client.ammProgram.methods
      .create(createRequest.params)
      .accounts({
        payer,
        owner: owner.publicKey,
        tokenWalletAuthority: tokenWalletAuthority.publicKey,
        tokenWalletB,
        mintA: params.mintA,
        mintB: params.mintB,
        tokenProgramA: createRequest.tokenProgramA,
        tokenProgramB: createRequest.tokenProgramB,
      })
      .instruction();

    instructions.push(createIx);

    // Build and send transaction
    const tx = new Transaction().add(...instructions);
    
    if (options?.priorityFee && options.priorityFee !== "auto") {
      // Add priority fee instruction
      tx.add(
        anchor.web3.ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: options.priorityFee,
        })
      );
    }

    const signature = await this.client.provider.sendAndConfirm(
      tx,
      [owner, tokenWalletAuthority],
      {
        skipPreflight: options?.skipPreflight ?? this.client.getConfig().skipPreflight,
        commitment: options?.commitment ?? this.client.getConfig().commitment,
      }
    );

    const poolAddress = this.getPoolAddress(owner.publicKey, params.mintA, params.mintB);

    return {
      signature,
      poolAddress,
    };
  }

  /**
   * Launch pool with token factory integration
   */
  async launchPoolWithFactory(
    params: {
      tokenName: string;
      tokenSymbol: string;
      tokenSupply: number;
      initialMarketCap: number;
      royaltiesBps: number;
      useToken2022?: boolean;
    },
    options?: TransactionOptions
  ): Promise<{
    signature: string;
    poolAddress: PublicKey;
    tokenMint: PublicKey;
  }> {
    // This would integrate with the factory client
    throw new Error("Not implemented yet - will be implemented with FactoryClient");
  }

  /**
   * Claim fees from a pool
   */
  async claimFees(
    poolAddress: PublicKey,
    options?: TransactionOptions
  ): Promise<string> {
    if (!this.client.isWalletConnected()) {
      throw new Error("Wallet not connected");
    }

    const pool = await this.getPool(poolAddress);
    if (!pool) {
      throw new Error("Pool not found");
    }

    const user = this.client.wallet!.publicKey;

    const tx = await this.client.ammProgram.methods
      .claim()
      .accounts({
        user,
        owner: pool.owner,
        mintA: pool.mintA,
        mintB: pool.mintB,
      })
      .transaction();

    if (options?.priorityFee && options.priorityFee !== "auto") {
      tx.add(
        anchor.web3.ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: options.priorityFee,
        })
      );
    }

    return await this.client.provider.sendAndConfirm(tx, [], {
      skipPreflight: options?.skipPreflight ?? this.client.getConfig().skipPreflight,
      commitment: options?.commitment ?? this.client.getConfig().commitment,
    });
  }

  /**
   * Get pool statistics
   */
  async getPoolStats(poolAddress: PublicKey): Promise<{
    tvl: anchor.BN;
    volume24h: anchor.BN;
    fees24h: anchor.BN;
    apy: number;
  } | null> {
    // This would fetch from API or calculate from on-chain data
    const pool = await this.getPool(poolAddress);
    if (!pool) return null;

    // Placeholder calculations
    return {
      tvl: pool.reserveA.add(pool.reserveB),
      volume24h: new anchor.BN(0), // Would fetch from API
      fees24h: new anchor.BN(0), // Would fetch from API
      apy: 0, // Would calculate based on fees
    };
  }
}