import * as anchor from "@coral-xyz/anchor";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { VertigoClient } from "./VertigoClient";
import { TransactionOptions } from "../types/client";
import {
  createInitializeMint2Instruction,
  createMintToInstruction,
  getMinimumBalanceForRentExemptMint,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  MINT_SIZE,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
} from "@solana/spl-token";

/**
 * Metadata for token creation
 */
export type TokenMetadata = {
  /** Token name (e.g., "My Token") */
  name: string;
  /** Token symbol (e.g., "MTK") */
  symbol: string;
  /** Number of decimals (default: 9) */
  decimals?: number;
  /** Optional URI pointing to token metadata JSON */
  uri?: string;
};

/**
 * Parameters for launching a new token
 */
export type LaunchTokenParams = {
  /** Token metadata */
  metadata: TokenMetadata;
  /** Total supply of tokens (in whole units, will be multiplied by 10^decimals) */
  supply: number;
  /** Whether to use Token-2022 program instead of standard SPL token (default: false) */
  useToken2022?: boolean;
};

/**
 * Parameters for launching a token with an associated liquidity pool
 */
export type LaunchTokenWithPoolParams = LaunchTokenParams & {
  /** Initial market cap in lamports (smallest unit) */
  initialMarketCap: number;
  /** Royalty fee in basis points (e.g., 250 = 2.5%) */
  royaltiesBps: number;
  /** Optional launch time as Unix timestamp */
  launchTime?: anchor.BN;
};

/**
 * Result of launching a token with pool
 */
export type LaunchTokenWithPoolResult = {
  /** Transaction signature for token creation */
  tokenSignature: string;
  /** Transaction signature for pool creation */
  poolSignature: string;
  /** Address of the created token mint */
  mintAddress: PublicKey;
  /** Address of the created liquidity pool */
  poolAddress: PublicKey;
};

/**
 * Client for creating and launching tokens with optional liquidity pools
 *
 * @example
 * ```ts
 * const vertigo = await Vertigo.load({ connection, wallet });
 *
 * // Launch a simple token
 * const { signature, mintAddress } = await vertigo.factory.launchToken({
 *   metadata: {
 *     name: "My Token",
 *     symbol: "MTK",
 *     decimals: 9,
 *   },
 *   supply: 1_000_000, // 1 million tokens
 * });
 *
 * // Launch a token with liquidity pool
 * const result = await vertigo.factory.launchTokenWithPool({
 *   metadata: {
 *     name: "My Token",
 *     symbol: "MTK",
 *   },
 *   supply: 1_000_000,
 *   initialMarketCap: 50_000_000_000, // 50 SOL
 *   royaltiesBps: 250, // 2.5% fees
 * });
 * ```
 */
export class FactoryClient {
  constructor(private client: VertigoClient) {}

  /**
   * Launch a new SPL token or Token-2022
   *
   * Creates a new token mint, initializes it, and mints the initial supply
   * to the wallet's associated token account.
   *
   * @param params - Token launch parameters
   * @param options - Optional transaction options (priority fees, commitment, etc.)
   * @returns Transaction signature and mint address
   *
   * @throws {Error} If wallet is not connected
   *
   * @example
   * ```ts
   * // Launch a standard SPL token
   * const { signature, mintAddress } = await factory.launchToken({
   *   metadata: {
   *     name: "My Token",
   *     symbol: "MTK",
   *     decimals: 9,
   *   },
   *   supply: 1_000_000, // 1 million tokens
   * });
   *
   * // Launch with Token-2022
   * const result = await factory.launchToken({
   *   metadata: {
   *     name: "My Token 2022",
   *     symbol: "MT22",
   *     decimals: 6,
   *   },
   *   supply: 10_000_000,
   *   useToken2022: true,
   * });
   * ```
   */
  async launchToken(
    params: LaunchTokenParams,
    options?: TransactionOptions
  ): Promise<{
    signature: string;
    mintAddress: PublicKey;
  }> {
    if (!this.client.isWalletConnected()) {
      throw new Error("Wallet not connected");
    }

    const payer = this.client.wallet!.publicKey;
    const mintKeypair = Keypair.generate();
    const tokenProgram = params.useToken2022
      ? TOKEN_2022_PROGRAM_ID
      : TOKEN_PROGRAM_ID;
    const decimals = params.metadata.decimals ?? 9;

    const tx = new Transaction();

    // Create mint account
    const lamports = await getMinimumBalanceForRentExemptMint(
      this.client.connection
    );

    tx.add(
      SystemProgram.createAccount({
        fromPubkey: payer,
        newAccountPubkey: mintKeypair.publicKey,
        space: MINT_SIZE,
        lamports,
        programId: tokenProgram,
      })
    );

    // Initialize mint
    tx.add(
      createInitializeMint2Instruction(
        mintKeypair.publicKey,
        decimals,
        payer,
        payer,
        tokenProgram
      )
    );

    // Create token account for the owner
    const ownerTokenAccount = getAssociatedTokenAddressSync(
      mintKeypair.publicKey,
      payer,
      false,
      tokenProgram
    );

    tx.add(
      createAssociatedTokenAccountIdempotentInstruction(
        payer,
        ownerTokenAccount,
        payer,
        mintKeypair.publicKey,
        tokenProgram
      )
    );

    // Mint tokens to owner
    const amount = new anchor.BN(params.supply).mul(
      new anchor.BN(10).pow(new anchor.BN(decimals))
    );

    tx.add(
      createMintToInstruction(
        mintKeypair.publicKey,
        ownerTokenAccount,
        payer,
        BigInt(amount.toString()),
        [],
        tokenProgram
      )
    );

    // Add priority fee if specified
    if (options?.priorityFee && options.priorityFee !== "auto") {
      tx.add(
        anchor.web3.ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: options.priorityFee,
        })
      );
    }

    const signature = await this.client.provider.sendAndConfirm(
      tx,
      [mintKeypair],
      {
        skipPreflight:
          options?.skipPreflight ?? this.client.getConfig().skipPreflight,
        commitment: options?.commitment ?? this.client.getConfig().commitment,
      }
    );

    return {
      signature,
      mintAddress: mintKeypair.publicKey,
    };
  }

  /**
   * Launch a new token and create a liquidity pool in one operation
   *
   * This is a convenience method that combines token creation with automatic
   * liquidity pool setup. The pool will be paired with SOL as the base token.
   *
   * This method executes two transactions:
   * 1. Creates the token and mints initial supply
   * 2. Creates a liquidity pool paired with SOL
   *
   * @param params - Token and pool launch parameters
   * @param options - Optional transaction options (priority fees, commitment, etc.)
   * @returns Both transaction signatures, mint address, and pool address
   *
   * @throws {Error} If wallet is not connected
   * @throws {Error} If token creation fails
   * @throws {Error} If pool creation fails
   *
   * @example
   * ```ts
   * // Launch token with liquidity pool
   * const result = await factory.launchTokenWithPool({
   *   metadata: {
   *     name: "My Token",
   *     symbol: "MTK",
   *     decimals: 9,
   *   },
   *   supply: 1_000_000, // 1 million tokens
   *   initialMarketCap: 50_000_000_000, // 50 SOL
   *   royaltiesBps: 250, // 2.5% royalty fees
   * });
   *
   * console.log("Token created:", result.mintAddress.toBase58());
   * console.log("Pool created:", result.poolAddress.toBase58());
   * console.log("Token tx:", result.tokenSignature);
   * console.log("Pool tx:", result.poolSignature);
   *
   * // Launch with custom timing
   * const scheduledResult = await factory.launchTokenWithPool({
   *   metadata: { name: "Future Token", symbol: "FUT" },
   *   supply: 1_000_000,
   *   initialMarketCap: 100_000_000_000,
   *   royaltiesBps: 500,
   *   launchTime: new anchor.BN(Date.now() / 1000 + 3600), // Launch in 1 hour
   * });
   * ```
   */
  async launchTokenWithPool(
    params: LaunchTokenWithPoolParams,
    options?: TransactionOptions
  ): Promise<LaunchTokenWithPoolResult> {
    if (!this.client.isWalletConnected()) {
      throw new Error("Wallet not connected");
    }

    // First, create the token
    const { signature: tokenSignature, mintAddress } = await this.launchToken(
      {
        metadata: params.metadata,
        supply: params.supply,
        useToken2022: params.useToken2022,
      },
      options
    );

    // Then, create the pool with the new token
    const { signature: poolSignature, poolAddress } =
      await this.client.pools.createPool(
        {
          mintA: new PublicKey("So11111111111111111111111111111111111111112"), // Native SOL
          mintB: mintAddress,
          initialMarketCap: params.initialMarketCap,
          royaltiesBps: params.royaltiesBps,
          launchTime: params.launchTime,
        },
        options
      );

    return {
      tokenSignature,
      poolSignature,
      mintAddress,
      poolAddress,
    };
  }
}
