import * as anchor from "@coral-xyz/anchor";
import { type Program } from "@coral-xyz/anchor";
import { type Keypair, type Connection, PublicKey } from "@solana/web3.js";
import type { Amm } from "../target/types/amm";
import { Token2022Factory } from "./token-2022-factory";
import { SplTokenFactory } from "./spl-token-factory";
import { SDKError, SDKErrorType } from "./types/error";

import { confirmTransaction } from "./utils/helpers";

import dotenv from "dotenv";
import { PoolConfig, POOL_SEED } from "./types";
import { VertigoConfig } from "./vertigo-config";
dotenv.config();

/**
 * Configuration options for the Vertigo SDK
 */
export interface SDKConfig {
  /** Log level for SDK operations */
  logLevel?: "verbose" | "tx" | "none";
  /** Explorer to use for transaction links */
  explorer?: "solscan" | "solanaExplorer";
}

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
    sdkConfig: SDKConfig = {}
  ) {
    try {
      this.config = new VertigoConfig(connection, wallet, sdkConfig);
      this.Token2022Factory = new Token2022Factory(this.config);
      this.SPLTokenFactory = new SplTokenFactory(this.config);

      this.amm = new anchor.Program(
        require(process.env.PATH_TO_AMM_IDL as string),
        this.config.provider
      ) as Program<Amm>;
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
   *   signature: string,
   * }>} Object containing transaction signature and relevant addresses
   */
  async launchPool({
    poolParams,
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
    devTaB,
  }: {
    poolParams: PoolConfig;
    payer: Keypair;
    owner: Keypair;
    tokenWalletAuthority: Keypair;
    tokenWalletB: PublicKey;
    mintA: PublicKey;
    mintB: PublicKey;
    tokenProgramA: PublicKey;
    tokenProgramB: PublicKey;
    devBuyAmount?: anchor.BN;
    dev?: Keypair;
    devTaA?: PublicKey;
    devTaB?: PublicKey;
  }): Promise<{ signature: string; poolAddress: PublicKey }> {
    this.config.log("🚀 Launching new pool...");

    const [pool, bump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from(POOL_SEED),
        owner.publicKey.toBuffer(),
        mintA.toBuffer(),
        mintB.toBuffer(),
      ],
      this.amm.programId
    );

    // Prepare pool creation params
    const params = {
      ...poolParams,
      bump,
    };

    this.config.log("📡 Sending pool creation transaction...");
    // Create the pool
    const createSignature = await this.amm.methods
      .create(params)
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

    if (devBuyAmount && dev && devTaA && devTaB) {
      const buySignature = await this.amm.methods
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

    return {
      signature: createSignature,
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
    amount,
    limit,
    owner,
    mintA,
    mintB,
  }: {
    amount: anchor.BN;
    limit: anchor.BN;
    owner: PublicKey;
    mintA: PublicKey;
    mintB: PublicKey;
  }) {
    try {
      return await this.amm.methods
        .quoteBuy({
          amount,
          limit,
        })
        .accounts({
          owner,
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
    amount,
    limit,
    owner,
    mintA,
    mintB,
  }: {
    amount: anchor.BN;
    limit: anchor.BN;
    owner: PublicKey;
    mintA: PublicKey;
    mintB: PublicKey;
  }) {
    try {
      return await this.amm.methods
        .quoteSell({
          amount,
          limit,
        })
        .accounts({
          owner,
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
   * @param {PublicKey} params.userTaB - Address of the user's token account for the B side
   * @param {PublicKey} params.tokenProgramA - Token program for the A side
   * @param {PublicKey} params.tokenProgramB - Token program for the B side
   * @param {anchor.BN} params.amount - Amount of SOL to spend (in lamports)
   * @param {anchor.BN} params.limit - Maximum amount of token B expected to receive
   * @returns {Promise<string>} Transaction signature
   * @throws {SDKError} Will throw if the slippage limit is not met or if there's insufficient liquidity
   */
  async buy({
    amount,
    limit,
    owner,
    user,
    mintA,
    mintB,
    userTaA,
    userTaB,
    tokenProgramA,
    tokenProgramB,
  }: {
    amount: anchor.BN;
    limit: anchor.BN;
    owner: PublicKey;
    user: Keypair;
    mintA: PublicKey;
    mintB: PublicKey;
    userTaA: PublicKey;
    userTaB: PublicKey;
    tokenProgramA: PublicKey;
    tokenProgramB: PublicKey;
  }) {
    try {
      this.config.log("📡 Sending buy transaction...");
      const signature = await this.amm.methods
        .buy({
          amount,
          limit,
        })
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
        .rpc();

      await confirmTransaction(this.config.connection, signature);
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
   * @param {PublicKey} params.userTaA - Address of the user's token account for the A side
   * @param {PublicKey} params.userTaB - Address of the user's token account for the B side
   * @param {PublicKey} params.tokenProgramA - Token program for the A side
   * @param {PublicKey} params.tokenProgramB - Token program for the B side
   * @param {anchor.BN} params.amount - Amount of tokens to sell
   * @param {anchor.BN} params.limit - Maximum amount of token A expected to receive
   * @returns {Promise<string>} Transaction signature
   * @throws {SDKError} Will throw if the slippage limit is not met or if there's insufficient liquidity
   */
  async sell({
    amount,
    limit,
    owner,
    user,
    mintA,
    mintB,
    userTaA,
    userTaB,
    tokenProgramA,
    tokenProgramB,
  }: {
    amount: anchor.BN;
    limit: anchor.BN;
    owner: PublicKey;
    user: Keypair;
    mintA: PublicKey;
    mintB: PublicKey;
    userTaA: PublicKey;
    userTaB: PublicKey;
    tokenProgramA: PublicKey;
    tokenProgramB: PublicKey;
  }) {
    try {
      this.config.log("📡 Sending sell transaction...");
      const signature = await this.amm.methods
        .sell({
          amount,
          limit,
        })
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
        .rpc();

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
  }: {
    pool: PublicKey;
    claimer: Keypair;
    mintA: PublicKey;
    receiverTaA: PublicKey;
    tokenProgramA: PublicKey;
  }): Promise<string> {
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

  /**
   * Disables a pool
   * @param {Object} args - The arguments object
   * @param {Keypair} owner - Keypair of the pool owner
   * @param {PublicKey} pool - Address of the trading pool
   * @returns {Promise<string>} Transaction signature
   */
  async disablePool({ owner, pool }: { owner: Keypair; pool: PublicKey }) {
    const signature = await this.amm.methods
      .disable()
      .accounts({ pool, owner: owner.publicKey })
      .signers([owner])
      .rpc();

    this.config.logTx(signature, "Disable pool");
    return signature;
  }

  /**
   * Enables a pool
   * @param {Object} args - The arguments object
   * @param {Keypair} owner - Keypair of the pool owner
   * @param {PublicKey} pool - Address of the trading pool
   * @returns {Promise<string>} Transaction signature
   */
  async enablePool({ owner, pool }: { owner: Keypair; pool: PublicKey }) {
    const signature = await this.amm.methods
      .enable()
      .accounts({ pool, owner: owner.publicKey })
      .signers([owner])
      .rpc();

    this.config.logTx(signature, "Enable pool");
    return signature;
  }
}
