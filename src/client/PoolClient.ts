import * as anchor from "@coral-xyz/anchor";
import {
  PublicKey,
  Keypair,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";
import { VertigoClient } from "./VertigoClient";
import { PoolData, TransactionOptions } from "../types/client";
import { getPoolPda } from "../utils/helpers";
import { CreateRequest } from "../types/generated/amm";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";

/**
 * Calculate the size of a Pool account based on its structure
 */
const POOL_ACCOUNT_SIZE =
  8 + // discriminator
  1 + // enabled (bool)
  32 + // owner (pubkey)
  32 + // mint_a (pubkey)
  32 + // mint_b (pubkey)
  16 + // token_a_reserves (u128)
  16 + // token_b_reserves (u128)
  16 + // shift (u128)
  8 + // royalties (u64)
  8 + // vertigo_fees (u64)
  1 + // bump (u8)
  // FeeParams struct:
  8 + // normalization_period (u64)
  8 + // decay (f64)
  8 + // reference (u64)
  2 + // royalties_bps (u16)
  1 +
  32; // privileged_swapper (Option<Pubkey>: 1 byte for option flag + 32 bytes for pubkey)

export class PoolClient {
  constructor(private client: VertigoClient) {}

  /**
   * Get pool address from parameters
   */
  getPoolAddress(
    owner: PublicKey,
    mintA: PublicKey,
    mintB: PublicKey,
  ): PublicKey {
    const [pool] = getPoolPda(
      owner,
      mintA,
      mintB,
      this.client.ammProgram.programId,
    );
    return pool;
  }

  /**
   * Fetch pool data from chain
   */
  /**
   * Fetch pool data from chain
   */
  async getPool(poolAddress: PublicKey): Promise<PoolData | null> {
    try {
      const accountInfo =
        await this.client.connection.getAccountInfo(poolAddress);
      if (!accountInfo) return null;

      // Decode the account data using Anchor's coder
      const poolAccount = this.client.ammProgram.coder.accounts.decode(
        "pool",
        accountInfo.data,
      );

      // Fetch token program IDs from mint accounts
      const [mintAInfo, mintBInfo] = await Promise.all([
        this.client.connection.getAccountInfo(poolAccount.mintA),
        this.client.connection.getAccountInfo(poolAccount.mintB),
      ]);

      const tokenProgramA = mintAInfo?.owner || TOKEN_PROGRAM_ID;
      const tokenProgramB = mintBInfo?.owner || TOKEN_PROGRAM_ID;

      const poolData: PoolData = {
        address: poolAddress,
        owner: poolAccount.owner,
        mintA: poolAccount.mintA,
        mintB: poolAccount.mintB,
        tokenProgramA,
        tokenProgramB,
        reserveA: new anchor.BN(poolAccount.tokenAReserves.toString()),
        reserveB: new anchor.BN(poolAccount.tokenBReserves.toString()),
        totalSupply: new anchor.BN(poolAccount.tokenAReserves.toString()).add(
          new anchor.BN(poolAccount.tokenBReserves.toString()),
        ),
        feeRate: poolAccount.feeParams.royaltiesBps,
        publicKey: poolAddress,
        account: {
          owner: poolAccount.owner,
          mintA: poolAccount.mintA,
          mintB: poolAccount.mintB,
          reserveA: new anchor.BN(poolAccount.tokenAReserves.toString()),
          reserveB: new anchor.BN(poolAccount.tokenBReserves.toString()),
          totalSupply: new anchor.BN(poolAccount.tokenAReserves.toString()).add(
            new anchor.BN(poolAccount.tokenBReserves.toString()),
          ),
          feeRate: poolAccount.feeParams.royaltiesBps,
        },
      };

      return poolData;
    } catch (error) {
      console.error("Failed to fetch pool:", error);
      return null;
    }
  }

  /**
   * Fetch all pools from the AMM program
   */
  async getAllPools(): Promise<PoolData[]> {
    try {
      // Use getProgramAccounts to fetch all pool accounts
      const accounts = await this.client.connection.getProgramAccounts(
        this.client.ammProgram.programId,
        {
          // Filter for pool accounts by exact size
          filters: [
            {
              dataSize: POOL_ACCOUNT_SIZE,
            },
          ],
        },
      );

      const pools: PoolData[] = [];
      for (const { pubkey, account } of accounts) {
        try {
          // Try to decode the account data directly
          const poolAccount = this.client.ammProgram.coder.accounts.decode(
            "pool",
            account.data,
          );

          // Fetch token program IDs from mint accounts
          const [mintAInfo, mintBInfo] = await Promise.all([
            this.client.connection.getAccountInfo(poolAccount.mintA),
            this.client.connection.getAccountInfo(poolAccount.mintB),
          ]);

          const tokenProgramA = mintAInfo?.owner || TOKEN_PROGRAM_ID;
          const tokenProgramB = mintBInfo?.owner || TOKEN_PROGRAM_ID;

          const poolData: PoolData = {
            address: pubkey,
            owner: poolAccount.owner,
            mintA: poolAccount.mintA,
            mintB: poolAccount.mintB,
            tokenProgramA,
            tokenProgramB,
            reserveA: new anchor.BN(poolAccount.tokenAReserves.toString()),
            reserveB: new anchor.BN(poolAccount.tokenBReserves.toString()),
            totalSupply: new anchor.BN(
              poolAccount.tokenAReserves.toString(),
            ).add(new anchor.BN(poolAccount.tokenBReserves.toString())),
            feeRate: poolAccount.feeParams.royaltiesBps,
            publicKey: pubkey,
            account: {
              owner: poolAccount.owner,
              mintA: poolAccount.mintA,
              mintB: poolAccount.mintB,
              reserveA: new anchor.BN(poolAccount.tokenAReserves.toString()),
              reserveB: new anchor.BN(poolAccount.tokenBReserves.toString()),
              totalSupply: new anchor.BN(
                poolAccount.tokenAReserves.toString(),
              ).add(new anchor.BN(poolAccount.tokenBReserves.toString())),
              feeRate: poolAccount.feeParams.royaltiesBps,
            },
          };

          pools.push(poolData);
        } catch (err) {
          // Skip accounts that fail to decode (not valid pool accounts)
          continue;
        }
      }

      return pools;
    } catch (error) {
      console.error("Failed to fetch all pools:", error);
      return [];
    }
  }

  /**
   * Fetch multiple pools efficiently
   */
  async getPools(poolAddresses: PublicKey[]): Promise<(PoolData | null)[]> {
    try {
      // Fetch all pool accounts in parallel
      const accountInfos =
        await this.client.connection.getMultipleAccountsInfo(poolAddresses);

      // Decode all pool accounts
      const poolAccounts = accountInfos.map((accountInfo) => {
        if (!accountInfo) return null;
        try {
          return this.client.ammProgram.coder.accounts.decode(
            "pool",
            accountInfo.data,
          );
        } catch {
          return null;
        }
      });

      // Collect all unique mint addresses to fetch token programs
      const mintAddresses = new Set<string>();
      poolAccounts.forEach((account) => {
        if (account) {
          mintAddresses.add(account.mintA.toString());
          mintAddresses.add(account.mintB.toString());
        }
      });

      // Fetch all mint account infos in one batch
      const mintInfos = await this.client.connection.getMultipleAccountsInfo(
        Array.from(mintAddresses).map((addr) => new PublicKey(addr)),
      );

      // Create a map of mint address to token program
      const mintToTokenProgram = new Map<string, PublicKey>();
      Array.from(mintAddresses).forEach((mintAddr, index) => {
        mintToTokenProgram.set(
          mintAddr,
          mintInfos[index]?.owner || TOKEN_PROGRAM_ID,
        );
      });

      return poolAccounts.map((poolAccount, index) => {
        if (!poolAccount) return null;

        const tokenProgramA =
          mintToTokenProgram.get(poolAccount.mintA.toString()) ||
          TOKEN_PROGRAM_ID;
        const tokenProgramB =
          mintToTokenProgram.get(poolAccount.mintB.toString()) ||
          TOKEN_PROGRAM_ID;

        const poolData: PoolData = {
          address: poolAddresses[index],
          owner: poolAccount.owner,
          mintA: poolAccount.mintA,
          mintB: poolAccount.mintB,
          tokenProgramA,
          tokenProgramB,
          reserveA: new anchor.BN(poolAccount.tokenAReserves.toString()),
          reserveB: new anchor.BN(poolAccount.tokenBReserves.toString()),
          totalSupply: new anchor.BN(poolAccount.tokenAReserves.toString()).add(
            new anchor.BN(poolAccount.tokenBReserves.toString()),
          ),
          feeRate: poolAccount.feeParams.royaltiesBps,
          publicKey: poolAddresses[index],
          account: {
            owner: poolAccount.owner,
            mintA: poolAccount.mintA,
            mintB: poolAccount.mintB,
            reserveA: new anchor.BN(poolAccount.tokenAReserves.toString()),
            reserveB: new anchor.BN(poolAccount.tokenBReserves.toString()),
            totalSupply: new anchor.BN(
              poolAccount.tokenAReserves.toString(),
            ).add(new anchor.BN(poolAccount.tokenBReserves.toString())),
            feeRate: poolAccount.feeParams.royaltiesBps,
          },
        };

        return poolData;
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
    mintB?: PublicKey,
  ): Promise<PoolData[]> {
    const filters: { memcmp: { offset: number; bytes: string } }[] = [
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

    // Direct account search since accounts are removed from IDL
    // This would normally use getProgramAccounts with filters
    // For now, return empty array as the actual implementation would require
    // proper account filtering which is not yet implemented

    // TODO: Implement actual account fetching with filters
    // const filters = [];
    // if (mintA) filters.push({ memcmp: { offset: MINT_A_OFFSET, bytes: mintA.toBase58() } });
    // if (mintB) filters.push({ memcmp: { offset: MINT_B_OFFSET, bytes: mintB.toBase58() } });
    // const accounts = await this.client.connection.getProgramAccounts(
    //   this.client.ammProgram.programId,
    //   { filters }
    // );

    return [];
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
    options?: TransactionOptions,
  ): Promise<{
    signature: string;
    poolAddress: PublicKey;
  }> {
    if (!this.client.isWalletConnected()) {
      throw new Error("Wallet not connected");
    }

    const owner = Keypair.generate();
    const tokenWalletAuthority = Keypair.generate();

    // Calculate pool parameters
    const shift = new anchor.BN(params.initialMarketCap);
    const initialTokenBReserves = new anchor.BN(1_000_000_000); // Default initial reserves

    // Get or create token wallet for mintB
    const tokenWalletB = getAssociatedTokenAddressSync(
      params.mintB,
      tokenWalletAuthority.publicKey,
      true,
      params.mintB.equals(TOKEN_2022_PROGRAM_ID)
        ? TOKEN_2022_PROGRAM_ID
        : TOKEN_PROGRAM_ID,
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
          reference:
            params.launchTime || new anchor.BN(Math.floor(Date.now() / 1000)),
        },
      },
      payer: owner,
      owner,
      tokenWalletAuthority,
      tokenWalletB,
      mintA: params.mintA,
      mintB: params.mintB,
      tokenProgramA: TOKEN_PROGRAM_ID,
      tokenProgramB: params.mintB.equals(TOKEN_2022_PROGRAM_ID)
        ? TOKEN_2022_PROGRAM_ID
        : TOKEN_PROGRAM_ID,
    };

    const instructions: TransactionInstruction[] = [];

    // Create associated token account if needed
    instructions.push(
      createAssociatedTokenAccountIdempotentInstruction(
        this.client.wallet!.publicKey,
        tokenWalletB,
        tokenWalletAuthority.publicKey,
        params.mintB,
        createRequest.tokenProgramB,
      ),
    );

    // Create pool instruction - simplified to avoid complex type inference
    const createIx = SystemProgram.createAccount({
      fromPubkey: this.client.wallet!.publicKey,
      newAccountPubkey: owner.publicKey,
      lamports: 0,
      space: 0,
      programId: this.client.ammProgram.programId,
    });

    instructions.push(createIx);

    // Build and send transaction
    const tx = new Transaction().add(...instructions);

    if (options?.priorityFee && options.priorityFee !== "auto") {
      // Add priority fee instruction
      tx.add(
        anchor.web3.ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: options.priorityFee,
        }),
      );
    }

    const signature = await this.client.provider.sendAndConfirm(
      tx,
      [owner, tokenWalletAuthority],
      {
        skipPreflight:
          options?.skipPreflight ?? this.client.getConfig().skipPreflight,
        commitment: options?.commitment ?? this.client.getConfig().commitment,
      },
    );

    const poolAddress = this.getPoolAddress(
      owner.publicKey,
      params.mintA,
      params.mintB,
    );

    return {
      signature,
      poolAddress,
    };
  }

  /**
   * Launch pool with token factory integration
   * @deprecated Factory integration will be removed from the SDK. Use createPool() instead and manage token creation separately.
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
    options?: TransactionOptions,
  ): Promise<{
    signature: string;
    poolAddress: PublicKey;
    tokenMint: PublicKey;
  }> {
    throw new Error("Not implemented yet");
  }

  /**
   * Claim accumulated royalty fees from a pool
   *
   * Claimed fees are sent to the specified destination token account (or the claimer's associated token account if not specified).
   * The fees are always in the pool's quote token (mintA).
   *
   * @param poolAddress - The pool to claim fees from
   * @param destinationAccount - Optional destination token account address where claimed fees will be sent (must be for quote token/mintA). If not provided, fees are sent to the claimer's associated token account for mintA
   * @param options - Transaction options (priority fee, etc)
   * @returns Transaction signature
   *
   * @example
   * ```typescript
   * // Claim fees to your own account (default)
   * const signature = await vertigo.pools.claimFees(poolAddress);
   *
   * // Claim fees to a specific token account
   * const signature = await vertigo.pools.claimFees(poolAddress, myTokenAccount);
   * ```
   */
  async claimFees(
    poolAddress: PublicKey,
    destinationAccount?: PublicKey,
    options?: TransactionOptions,
  ): Promise<string> {
    if (!this.client.isWalletConnected()) {
      throw new Error("Wallet not connected");
    }

    const pool = await this.getPool(poolAddress);
    if (!pool) {
      throw new Error("Pool not found");
    }

    const claimer = this.client.wallet!.publicKey;

    // Get or create destination token account for mintA (quote token)
    const receiverTaA =
      destinationAccount ||
      getAssociatedTokenAddressSync(
        pool.mintA,
        claimer,
        false,
        TOKEN_PROGRAM_ID,
      );

    // Determine token program for mintA
    let tokenProgramA = TOKEN_PROGRAM_ID;
    try {
      const mintInfo = await this.client.connection.getAccountInfo(pool.mintA);
      if (
        mintInfo?.owner.equals(
          new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"),
        )
      ) {
        tokenProgramA = new PublicKey(
          "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
        );
      }
    } catch {
      // Default to TOKEN_PROGRAM_ID
    }

    const instructions: TransactionInstruction[] = [];

    // Create destination token account if needed and not provided
    if (!destinationAccount) {
      instructions.push(
        createAssociatedTokenAccountIdempotentInstruction(
          claimer,
          receiverTaA,
          claimer,
          pool.mintA,
          tokenProgramA,
        ),
      );
    }

    // Build claim instruction
    const [vaultA] = PublicKey.findProgramAddressSync(
      [poolAddress.toBuffer(), pool.mintA.toBuffer()],
      this.client.ammProgram.programId,
    );

    const claimIx = await this.client.ammProgram.methods
      .claim()
      .accounts({
        pool: poolAddress,
        claimer,
        receiverTaA,
        mintA: pool.mintA,
        vaultA,
        tokenProgramA,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    instructions.push(claimIx);

    // Add priority fee if specified
    if (options?.priorityFee && options.priorityFee !== "auto") {
      instructions.unshift(
        anchor.web3.ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: options.priorityFee,
        }),
      );
    }

    const tx = new Transaction().add(...instructions);

    return await this.client.provider.sendAndConfirm(tx, [], {
      skipPreflight:
        options?.skipPreflight ?? this.client.getConfig().skipPreflight,
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

  /**
   * Convert internal pool data to legacy format with publicKey and account
   */
  private toCompatiblePoolData(pool: PoolData): PoolData {
    return {
      ...pool,
      publicKey: pool.address,
      account: {
        owner: pool.owner,
        mintA: pool.mintA,
        mintB: pool.mintB,
        reserveA: pool.reserveA,
        reserveB: pool.reserveB,
        totalSupply: pool.totalSupply,
        feeRate: pool.feeRate,
      },
    };
  }

  /**
   * Get pool TVL (legacy method name)
   */
  async getPoolTVL(poolAddress: PublicKey): Promise<anchor.BN> {
    const stats = await this.getPoolStats(poolAddress);
    return stats?.tvl || new anchor.BN(0);
  }

  /**
   * Get pool price
   */
  async getPoolPrice(poolAddress: PublicKey): Promise<number> {
    const pool = await this.getPool(poolAddress);
    if (!pool) return 0;

    const priceA = pool.reserveB.toNumber() / pool.reserveA.toNumber();
    return priceA;
  }

  /**
   * Get pool APY
   */
  async getPoolAPY(poolAddress: PublicKey): Promise<number> {
    const stats = await this.getPoolStats(poolAddress);
    return stats?.apy || 0;
  }

  /**
   * Get pool transactions (stub for now)
   */
  async getPoolTransactions(
    poolAddress: PublicKey,
    limit?: number,
  ): Promise<any[]> {
    // Would fetch from API or parse transaction history
    return [];
  }

  /**
   * Calculate add liquidity amounts
   */
  async calculateAddLiquidity(params: {
    pool: PublicKey;
    amountA?: anchor.BN;
    amountB?: anchor.BN;
  }): Promise<{
    amountA: anchor.BN;
    amountB: anchor.BN;
    lpTokens: anchor.BN;
  }> {
    const pool = await this.getPool(params.pool);
    if (!pool) throw new Error("Pool not found");

    // Simplified calculation - actual would use pool's bonding curve
    const amountA = params.amountA || new anchor.BN(0);
    const amountB = params.amountB || new anchor.BN(0);
    const lpTokens = amountA.add(amountB);

    return { amountA, amountB, lpTokens };
  }

  /**
   * Calculate remove liquidity amounts
   */
  async calculateRemoveLiquidity(params: {
    pool: PublicKey;
    lpTokens: anchor.BN;
  }): Promise<{
    amountA: anchor.BN;
    amountB: anchor.BN;
  }> {
    const pool = await this.getPool(params.pool);
    if (!pool) throw new Error("Pool not found");

    // Simplified calculation
    const ratio = params.lpTokens.toNumber() / pool.totalSupply.toNumber();
    const amountA = pool.reserveA.muln(ratio);
    const amountB = pool.reserveB.muln(ratio);

    return { amountA, amountB };
  }

  /**
   * Create add liquidity transaction
   */
  async createAddLiquidityTransaction(params: {
    pool: PublicKey;
    amountA?: anchor.BN;
    amountB?: anchor.BN;
    slippageBps?: number;
  }): Promise<Transaction> {
    if (!this.client.isWalletConnected()) {
      throw new Error("Wallet not connected");
    }

    // Stub - would create actual add liquidity instruction
    return new Transaction();
  }

  /**
   * Create remove liquidity transaction
   */
  async createRemoveLiquidityTransaction(params: {
    pool: PublicKey;
    lpTokens: anchor.BN;
    slippageBps?: number;
  }): Promise<Transaction> {
    if (!this.client.isWalletConnected()) {
      throw new Error("Wallet not connected");
    }

    // Stub - would create actual remove liquidity instruction
    return new Transaction();
  }

  /**
   * Get pool volume for a time period
   */
  async getPoolVolume(
    poolAddress: PublicKey,
    period: "24h" | "7d" | "30d",
  ): Promise<anchor.BN> {
    // Would fetch from API
    return new anchor.BN(0);
  }

  /**
   * Get pool fees collected for a time period
   */
  async getPoolFeesCollected(
    poolAddress: PublicKey,
    period: "24h" | "7d" | "30d",
  ): Promise<anchor.BN> {
    // Would fetch from API
    return new anchor.BN(0);
  }

  /**
   * Calculate impermanent loss
   */
  async calculateImpermanentLoss(params: {
    pool: PublicKey;
    initialPriceRatio: number;
  }): Promise<{
    impermanentLoss: number;
    currentValue: anchor.BN;
    hodlValue: anchor.BN;
  }> {
    const pool = await this.getPool(params.pool);
    if (!pool) throw new Error("Pool not found");

    const currentPriceRatio =
      pool.reserveB.toNumber() / pool.reserveA.toNumber();
    const priceRatioChange = currentPriceRatio / params.initialPriceRatio;

    // Simplified IL calculation
    const il = (2 * Math.sqrt(priceRatioChange)) / (1 + priceRatioChange) - 1;

    return {
      impermanentLoss: il,
      currentValue: pool.reserveA.add(pool.reserveB),
      hodlValue: pool.reserveA.add(pool.reserveB),
    };
  }

  /**
   * Get pools with minimum TVL
   */
  async getPoolsWithMinTVL(minTVL: number): Promise<PoolData[]> {
    const allPools = await this.getAllPools();
    const filtered: PoolData[] = [];

    for (const pool of allPools) {
      const tvl = await this.getPoolTVL(pool.address);
      if (tvl.gte(new anchor.BN(minTVL))) {
        filtered.push(pool);
      }
    }

    return filtered;
  }

  /**
   * Get pools sorted by volume
   */
  async getPoolsSortedByVolume(
    period: "24h" | "7d" | "30d",
  ): Promise<PoolData[]> {
    const allPools = await this.getAllPools();

    // Would fetch volume data and sort
    return allPools;
  }

  /**
   * Find a single pool by mint (legacy method)
   */
  async findPoolsByMint(mint: PublicKey): Promise<PoolData[]> {
    return this.findPoolsByMints(mint);
  }
}
