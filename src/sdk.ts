import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import type { Connection, PublicKey } from "@solana/web3.js";
import type { Amm } from "../target/types/amm";
import { Token2022Factory } from "./token-2022-factory";
import { SplTokenFactory } from "./spl-token-factory";
import { SDKError, SDKErrorType } from "./types/error";
import { confirmTransaction, getPoolPda } from "./utils/helpers";
import { VertigoConfig } from "./config";
import { defaultConfig } from "./utils/config";
import {
  createAssociatedTokenAccount,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import type {
  CreateRequest,
  QuoteBuyRequest,
  SwapResponse,
  QuoteSellRequest,
  BuyRequest,
  SellRequest,
  ClaimRequest,
} from "./types/generated/amm";
import type { SDKConfig, DevBuyArgs } from "./types";

/**
 * Main SDK class for interacting with the Vertigo protocol
 * @class VertigoSDK
 */
export class VertigoSDK {
  private config: VertigoConfig;

  private amm: Program<Amm>;
  public Token2022Factory: Token2022Factory;
  public SPLTokenFactory: SplTokenFactory;

  constructor(
    connection: Connection,
    wallet: anchor.Wallet,
    sdkConfig: SDKConfig = defaultConfig
  ) {
    try {
      this.config = new VertigoConfig(connection, wallet, sdkConfig);

      const ammIdl = require(this.config.ammProgramPath as string);

      if (this.config.ammProgramIdOverride) {
        ammIdl.address = this.config.ammProgramIdOverride;
      }

      this.amm = new Program(ammIdl, this.config.provider) as Program<Amm>;
      this.Token2022Factory = new Token2022Factory(this.config, this.amm);
      this.SPLTokenFactory = new SplTokenFactory(this.config, this.amm);
    } catch (error) {
      throw new SDKError(
        "Failed to initialize SDK",
        SDKErrorType.InitializationError,
        error
      );
    }
  }

  /**
   * Launches a new trading pool with the specified configuration
   * @param {PoolConfig} args.poolParams - Pool configuration parameters including bonding curve constant and fee structure
   * @param {Keypair} args.payer - Keypair that will pay for the transaction
   * @param {Keypair} args.owner - Keypair that will own the pool
   * @param {Keypair} args.tokenWalletAuthority - Keypair with authority over the token wallet
   * @param {PublicKey} args.tokenWalletB - Public key of the token wallet for the B side
   * @param {PublicKey} args.mintA - Public key of the token mint for the A side
   * @param {PublicKey} args.mintB - Public key of the token mint for the B side
   * @param {PublicKey} args.tokenProgramA - Token program for the A side
   * @param {PublicKey} args.tokenProgramB - Token program for the B side
   * @param {anchor.BN} [args.devBuyAmount] - Optional amount of SOL (in lamports) for initial token purchase
   * @param {Keypair} [args.dev] - Optional Keypair to receive initial dev tokens
   *
   * @returns {Promise<{
   *   deploySignature: string,
   *   devBuySignature: string | null,
   *   poolAddress: PublicKey
   * }>} Object containing transaction signature and relevant addresses
   */
  async launchPool({
    params,
    payer,
    owner,
    tokenWalletAuthority,
    tokenWalletB,
    mintA,
    mintB,
    tokenProgramA,
    tokenProgramB,
    devBuyAmount,
    dev,
    devTaA,
  }: CreateRequest & Partial<DevBuyArgs>): Promise<{
    deploySignature: string;
    devBuySignature: string | null;
    poolAddress: PublicKey;
  }> {
    this.config.log("🚀 Launching new pool...");

    const privilegedSwapper =
      devBuyAmount && dev && devTaA ? dev.publicKey : null;

    // Prepare pool creation params
    const createParams = {
      ...params,
    };
    createParams.feeParams.privilegedSwapper = privilegedSwapper;

    this.config.log("📡 Sending pool creation transaction...");

    // Create the pool
    const createSignature = await this.amm.methods
      .create(createParams)
      .accounts({
        payer: payer.publicKey,
        owner: owner.publicKey,
        tokenWalletAuthority: tokenWalletAuthority.publicKey,
        tokenWalletB: tokenWalletB,
        mintA: mintA,
        mintB: mintB,
        tokenProgramA: tokenProgramA,
        tokenProgramB: tokenProgramB,
      })
      .signers([payer, owner, tokenWalletAuthority])
      .rpc();

    this.config.logTx(createSignature, "Pool creation");
    this.config.log("✅ Pool successfully created!");

    let buySignature: string | null = null;
    if (privilegedSwapper) {
      // get and create the dev TaB if it doesn't exist
      const devTaB = getAssociatedTokenAddressSync(
        mintB,
        dev.publicKey,
        false,
        tokenProgramB
      );
      try {
        await this.config.connection.getTokenAccountBalance(devTaB);
      } catch {
        await createAssociatedTokenAccount(
          this.config.connection,
          dev,
          mintB,
          dev.publicKey,
          undefined,
          tokenProgramB
        );
      }

      // send the dev buy transaction
      this.config.log("📡 Sending dev buy transaction...");
      buySignature = await this.amm.methods
        .buy({
          amount: devBuyAmount,
          limit: new anchor.BN(0),
        })
        .accounts({
          owner: owner.publicKey,
          user: dev.publicKey,
          mintA: mintA,
          mintB: mintB,
          userTaA: devTaA,
          userTaB: devTaB,
          tokenProgramA: tokenProgramA,
          tokenProgramB: tokenProgramB,
        })
        .signers([dev])
        .rpc();
      this.config.logTx(buySignature, "Dev buy");
    }

    const [pool, _] = getPoolPda(
      owner.publicKey,
      mintA,
      mintB,
      this.amm.programId
    );

    return {
      deploySignature: createSignature,
      devBuySignature: buySignature,
      poolAddress: pool,
    };
  }

  /**
   * Gets a quote for buying tokens from a pool
   * @param {Object} params - The parameters object
   * @param {anchor.BN} params.amount - Amount of token A to buy
   * @param {anchor.BN} params.limit - Maximum amount of token B expected to receive
   * @param {PublicKey} params.owner - Pool owner's public key
   * @param {PublicKey} params.mintA - Address of the token mint for the A side
   * @param {PublicKey} params.mintB - Address of the token mint for the B side
   * @returns {Promise<{amountB: BN, feeA: BN}>} Quote containing expected token amount and fees
   * @throws {SDKError} If the quote fails or validation fails
   */
  async quoteBuy({
    params,
    owner,
    user,
    mintA,
    mintB,
  }: QuoteBuyRequest): Promise<SwapResponse> {
    try {
      return this.amm.methods
        .quoteBuy(params)
        .accounts({
          owner,
          user,
          mintA,
          mintB,
        })
        .view();
    } catch (error) {
      console.error(error);
      throw new SDKError(
        "Failed to get buy quote",
        SDKErrorType.QuoteError,
        error
      );
    }
  }

  /**
   * Gets a quote for selling tokens to a pool
   * @param {Object} params - The parameters object
   * @param {anchor.BN} params.amount - Amount of token B to sell
   * @param {anchor.BN} params.limit - Minimum amount of token A expected to receive
   * @param {PublicKey} params.owner - Pool owner's public key
   * @param {PublicKey} params.mintA - Address of the token mint for the A side
   * @param {PublicKey} params.mintB - Address of the token mint for the B side
   * @returns {Promise<{amountA: BN, feeA: BN}>} Quote containing expected token A amount and fees
   * @throws {SDKError} If the quote fails or validation fails
   */
  async quoteSell({
    params,
    owner,
    user,
    mintA,
    mintB,
  }: QuoteSellRequest): Promise<SwapResponse> {
    try {
      return this.amm.methods
        .quoteSell(params)
        .accounts({
          owner,
          user,
          mintA,
          mintB,
        })
        .view();
    } catch (error) {
      throw new SDKError(
        "Failed to get sell quote",
        SDKErrorType.QuoteError,
        error
      );
    }
  }

  /**
   * Buys tokens from a pool using the bonding curve price
   * @param {Object} params - The parameters object
   * @param {PublicKey} params.owner - Address of the pool owner
   * @param {Keypair} params.user - Address of the user
   * @param {PublicKey} params.mintA - Address of the token mint for the A side
   * @param {PublicKey} params.mintB - Address of the token mint for the B side
   * @param {PublicKey} params.userTaA - Address of the user's token account for the A side
   * @param {PublicKey} [params.userTaB] - Optional address of the user's token account for the B side
   * @param {PublicKey} params.tokenProgramA - Token program for the A side
   * @param {PublicKey} params.tokenProgramB - Token program for the B side
   * @param {anchor.BN} params.amount - Amount of SOL to spend (in lamports)
   * @param {anchor.BN} params.limit - Maximum amount of token B expected to receive
   * @returns {Promise<string>} Transaction signature
   * @throws {SDKError} Will throw if the slippage limit is not met or if there's insufficient liquidity
   */
  async buy({
    params,
    owner,
    user,
    mintA,
    mintB,
    userTaA,
    userTaB: providedUserTaB,
    tokenProgramA,
    tokenProgramB,
  }: BuyRequest) {
    try {
      this.config.log("📡 Sending buy transaction...");

      // Derive receiving token account address if not provided
      const userTaB =
        providedUserTaB ||
        getAssociatedTokenAddressSync(
          mintB,
          user.publicKey,
          false,
          tokenProgramB
        );

      // Check if receiving token account exists
      const tx = new anchor.web3.Transaction();

      let userTaBExists = false;
      try {
        const balance = await this.config.connection.getTokenAccountBalance(
          userTaB
        );
        userTaBExists = true;
      } catch {
        userTaBExists = false;
      }

      if (!userTaBExists) {
        tx.add(
          createAssociatedTokenAccountInstruction(
            user.publicKey,
            userTaB,
            user.publicKey,
            mintB,
            tokenProgramB
          )
        );
      }

      // Add the buy instruction
      const buyIx = await this.amm.methods
        .buy(params)
        .accounts({
          owner,
          user: user.publicKey,
          mintA,
          mintB,
          userTaA,
          userTaB,
          tokenProgramA,
          tokenProgramB,
        })
        .signers([user])
        .instruction();

      tx.add(buyIx);

      // Create and send the transaction
      const signature = await this.config.provider.sendAndConfirm(tx, [user]);
      this.config.logTx(signature, "Buy");

      return signature;
    } catch (error) {
      throw new SDKError(
        "Failed to execute buy transaction",
        SDKErrorType.TransactionError,
        error
      );
    }
  }

  /**
   * Sells tokens back to the pool at the current bonding curve price
   * @param {Object} params - The parameters object
   * @param {PublicKey} params.owner - Public key of the pool owner
   * @param {PublicKey} params.mintA - Address of the token mint for the A side
   * @param {PublicKey} params.mintB - Address of the token mint for the B side
   * @param {Keypair} params.user - User's keypair
   * @param {PublicKey} [params.userTaA] - Optional address of the user's token account for the A side
   * @param {PublicKey} params.userTaB - Address of the user's token account for the B side
   * @param {PublicKey} params.tokenProgramA - Token program for the A side
   * @param {PublicKey} params.tokenProgramB - Token program for the B side
   * @param {anchor.BN} params.amount - Amount of tokens to sell
   * @param {anchor.BN} params.limit - Maximum amount of token A expected to receive
   * @returns {Promise<string>} Transaction signature
   * @throws {SDKError} Will throw if the slippage limit is not met or if there's insufficient liquidity
   */
  async sell({
    params,
    owner,
    user,
    mintA,
    mintB,
    userTaA: providedUserTaA,
    userTaB,
    tokenProgramA,
    tokenProgramB,
  }: SellRequest) {
    try {
      this.config.log("📡 Sending sell transaction...");

      // Derive receiving token account address if not provided
      const userTaA =
        providedUserTaA ||
        getAssociatedTokenAddressSync(
          mintA,
          user.publicKey,
          false,
          tokenProgramA
        );

      // Check if receiving token account exists
      const instructions = [];
      let userTaAExists = true;
      try {
        await this.config.connection.getTokenAccountBalance(userTaA);
      } catch {
        userTaAExists = false;
      }

      if (!userTaAExists) {
        instructions.push(
          createAssociatedTokenAccountInstruction(
            user.publicKey,
            userTaA,
            user.publicKey,
            mintA,
            tokenProgramA
          )
        );
      }

      // Add the sell instruction
      const sellIx = await this.amm.methods
        .sell(params)
        .accounts({
          owner,
          user: user.publicKey,
          mintA,
          mintB,
          userTaA,
          userTaB,
          tokenProgramA,
          tokenProgramB,
        })
        .instruction();

      instructions.push(sellIx);

      // Create and send the transaction
      const transaction = new anchor.web3.Transaction().add(...instructions);
      const signature = await this.config.provider.sendAndConfirm(transaction, [
        user,
      ]);

      await confirmTransaction(this.config.connection, signature);
      this.config.logTx(signature, "Sell");
      return signature;
    } catch (error) {
      throw new SDKError(
        "Failed to execute sell transaction",
        SDKErrorType.TransactionError,
        error
      );
    }
  }

  /**
   * Claims accumulated royalty fees from a pool
   * @param {Object} args - The arguments object
   * @param {PublicKey} args.pool - Address of the trading pool
   * @param {Keypair} args.claimer - Keypair authorized to claim royalties (must be royalties owner)
   * @param {PublicKey} args.mintA - Address of the token mint A
   * @param {PublicKey} args.receiverTaA - Address of the receiver's token account for the A side
   * @param {PublicKey} args.tokenProgramA - Token program for the A side
   * @returns {Promise<string>} Transaction signature
   * @throws Will throw if claimer is not the authorized royalties owner
   */
  async claimRoyalties({
    pool,
    claimer,
    mintA,
    receiverTaA,
    tokenProgramA,
  }: ClaimRequest): Promise<string> {
    const signature = await this.amm.methods
      .claim()
      .accounts({
        pool,
        claimer: claimer.publicKey,
        receiverTaA,
        mintA,
        tokenProgramA,
      })
      .signers([claimer])
      .rpc();

    this.config.logTx(signature, "Claim royalties");
    return signature;
  }
}
