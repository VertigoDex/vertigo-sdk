import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  type Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
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
  createCloseAccountInstruction,
  createInitializeAccountInstruction,
  getAssociatedTokenAddressSync,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
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
  public programId: PublicKey;

  constructor(
    provider: anchor.AnchorProvider,
    sdkConfig: SDKConfig = defaultConfig
  ) {
    try {
      this.config = new VertigoConfig(provider, sdkConfig);

      const ammIdl = require("../target/idl/amm.json");
      this.amm = new Program(ammIdl, this.config.provider) as Program<Amm>;
      this.programId = this.amm.programId;

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
   * Builds the instruction(s) for launching a new pool
   * @param {Object} params - The parameters object
   * @param {PoolConfig} params.poolParams - Pool configuration parameters
   * @param {Keypair} params.payer - Keypair that will pay for the transaction
   * @param {Keypair} params.owner - Keypair that will own the pool
   * @param {Keypair} params.tokenWalletAuthority - Keypair with authority over the token wallet
   * @param {PublicKey} params.tokenWalletB - Public key of the token wallet for the B side
   * @param {PublicKey} params.mintA - Public key of the token mint for the A side
   * @param {PublicKey} params.mintB - Public key of the token mint for the B side
   * @param {PublicKey} params.tokenProgramA - Token program for the A side
   * @param {PublicKey} params.tokenProgramB - Token program for the B side
   * @param {anchor.BN} [params.amount] - Optional amount of SOL (in lamports) for initial token purchase
   * @param {anchor.BN} [params.limit] - Optional limit for the dev buy
   * @param {Keypair} [params.dev] - Optional Keypair to receive initial dev tokens
   * @param {PublicKey} [params.devTaA] - Optional token account for dev's A tokens
   * @returns {Promise<{createInstructions: TransactionInstruction[], devBuyInstructions: TransactionInstruction[] | null, poolAddress: PublicKey}>} Object containing instructions and pool address
   * @throws {SDKError} Will throw if there's an error building the instructions
   */
  async buildLaunchPoolInstruction({
    params,
    payer,
    owner,
    tokenWalletAuthority,
    tokenWalletB,
    mintA,
    mintB,
    tokenProgramA,
    tokenProgramB,
    amount,
    limit,
    dev,
    devTaA,
  }: CreateRequest & Partial<DevBuyArgs>): Promise<{
    createInstructions: TransactionInstruction[];
    devBuyInstructions: TransactionInstruction[] | null;
    poolAddress: PublicKey;
  }> {
    try {
      const privilegedSwapper =
        amount && limit && dev && devTaA ? dev.publicKey : null;

      // Prepare pool creation params
      const createParams = {
        ...params,
      };
      createParams.feeParams.privilegedSwapper = privilegedSwapper;

      // Create the pool instruction
      const createIx = await this.amm.methods
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
        .instruction();

      const createInstructions = [createIx];

      // Get pool address
      const [pool, _] = getPoolPda(
        owner.publicKey,
        mintA,
        mintB,
        this.amm.programId
      );

      let devBuyInstructions: TransactionInstruction[] | null = null;
      if (privilegedSwapper) {
        // get and create the dev TaB if it doesn't exist
        const devTaB = getAssociatedTokenAddressSync(
          mintB,
          dev.publicKey,
          false,
          tokenProgramB
        );

        devBuyInstructions = [];

        // Check if dev TaB exists
        let devTaBExists = false;
        try {
          await this.config.connection.getTokenAccountBalance(devTaB);
          devTaBExists = true;
        } catch {
          devTaBExists = false;
        }

        if (!devTaBExists) {
          devBuyInstructions.push(
            createAssociatedTokenAccountInstruction(
              dev.publicKey,
              devTaB,
              dev.publicKey,
              mintB,
              tokenProgramB
            )
          );
        }

        // Add the dev buy instruction
        const buyIx = await this.amm.methods
          .buy({
            amount,
            limit,
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
          .instruction();

        devBuyInstructions.push(buyIx);
      }

      return {
        createInstructions,
        devBuyInstructions,
        poolAddress: pool,
      };
    } catch (error) {
      throw new SDKError(
        "Failed to build launch pool instructions",
        SDKErrorType.TransactionError,
        error
      );
    }
  }

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
    amount,
    limit,
    dev,
    devTaA,
  }: CreateRequest & Partial<DevBuyArgs>): Promise<{
    deploySignature: string;
    devBuySignature: string | null;
    poolAddress: PublicKey;
  }> {
    this.config.log("🚀 Launching new pool...");

    const { createInstructions, devBuyInstructions, poolAddress } =
      await this.buildLaunchPoolInstruction({
        params,
        payer,
        owner,
        tokenWalletAuthority,
        tokenWalletB,
        mintA,
        mintB,
        tokenProgramA,
        tokenProgramB,
        amount,
        limit,
        dev,
        devTaA,
      });

    this.config.log("📡 Sending pool creation transaction...");

    // Create and send the pool creation transaction
    const createTx = new anchor.web3.Transaction().add(...createInstructions);
    const createSignature = await this.config.provider.sendAndConfirm(
      createTx,
      [payer, owner, tokenWalletAuthority]
    );

    this.config.logTx(createSignature, "Pool creation");
    this.config.log("✅ Pool successfully created!");

    let buySignature: string | null = null;
    if (devBuyInstructions) {
      this.config.log("📡 Sending dev buy transaction...");
      const buyTx = new anchor.web3.Transaction().add(...devBuyInstructions);
      buySignature = await this.config.provider.sendAndConfirm(buyTx, [dev]);
      this.config.logTx(buySignature, "Dev buy");
    }

    return {
      deploySignature: createSignature,
      devBuySignature: buySignature,
      poolAddress,
    };
  }

  /**
   * Gets a quote for buying tokens from a pool
   * @param {Object} params - The parameters object
   * @param {anchor.BN} params.amount - Amount of token A to buy
   * @param {anchor.BN} params.limit - Maximum amount of token B expected to receive
   * @param {PublicKey} owner - Pool owner's public key
   * @param {PublicKey} user - User's public key
   * @param {PublicKey} mintA - Address of the token mint for the A side
   * @param {PublicKey} mintB - Address of the token mint for the B side
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
      return await this.amm.methods
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
   * @param {PublicKey} owner - Pool owner's public key
   * @param {PublicKey} user - User's public key
   * @param {PublicKey} mintA - Address of the token mint for the A side
   * @param {PublicKey} mintB - Address of the token mint for the B side
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
      return await this.amm.methods
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
   * Builds the instruction(s) for buying tokens from a pool
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
   * @returns {Promise<TransactionInstruction[]>} Array of instructions needed for the buy operation
   * @throws {SDKError} Will throw if there's an error building the instructions
   */
  async buildBuyInstruction({
    params,
    owner,
    user,
    mintA,
    mintB,
    userTaA,
    userTaB: providedUserTaB,
    tokenProgramA,
    tokenProgramB,
  }: BuyRequest): Promise<TransactionInstruction[]> {
    try {
      const instructions: TransactionInstruction[] = [];

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
        instructions.push(
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

      instructions.push(buyIx);
      return instructions;
    } catch (error) {
      throw new SDKError(
        "Failed to build buy instruction",
        SDKErrorType.TransactionError,
        error
      );
    }
  }

  /**
   * Builds the instruction(s) for selling tokens to a pool
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
   * @returns {Promise<TransactionInstruction[]>} Array of instructions needed for the sell operation
   * @throws {SDKError} Will throw if there's an error building the instructions
   */
  async buildSellInstruction({
    params,
    owner,
    user,
    mintA,
    mintB,
    userTaA: providedUserTaA,
    userTaB,
    tokenProgramA,
    tokenProgramB,
  }: SellRequest): Promise<TransactionInstruction[]> {
    try {
      const instructions: TransactionInstruction[] = [];

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
      return instructions;
    } catch (error) {
      throw new SDKError(
        "Failed to build sell instruction",
        SDKErrorType.TransactionError,
        error
      );
    }
  }

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
      const instructions = await this.buildBuyInstruction({
        params,
        owner,
        user,
        mintA,
        mintB,
        userTaA,
        userTaB: providedUserTaB,
        tokenProgramA,
        tokenProgramB,
      });

      // Create and send the transaction
      const tx = new anchor.web3.Transaction().add(...instructions);
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
      const instructions = await this.buildSellInstruction({
        params,
        owner,
        user,
        mintA,
        mintB,
        userTaA: providedUserTaA,
        userTaB,
        tokenProgramA,
        tokenProgramB,
      });

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
   * Builds the instruction(s) for claiming royalties from a pool
   * @param {Object} opts - The parameters object
   * @param {PublicKey} opts.pool - The pool address
   * @param {PublicKey} opts.claimer - The claimer's public key
   * @param {PublicKey} opts.mintA - The mint address for the A side
   * @param {PublicKey} opts.tokenProgramA - The token program for the A side
   * @param {PublicKey} opts.receiverTaA - The receiver's token account address for the A side
   * @param {boolean} [opts.unwrap=false] - Whether to unwrap SOL if mintA is native mint
   * @returns {Promise<{instructions: TransactionInstruction[], signers: Keypair[]}>} Object containing instructions and signers needed for the claim operation
   * @throws {SDKError} Will throw if there's an error building the instructions
   */
  async buildClaimInstruction({
    pool,
    claimer,
    mintA,
    tokenProgramA,
    receiverTaA,
    unwrap = false,
  }: Omit<ClaimRequest, "claimer"> & {
    claimer: PublicKey;
    unwrap?: boolean;
  }): Promise<{
    instructions: TransactionInstruction[];
    signers: Keypair[];
  }> {
    if (unwrap && !mintA.equals(NATIVE_MINT)) {
      throw new Error("unwrap=true only valid for wSOL");
    }

    const instructions: TransactionInstruction[] = [];
    const signers: Keypair[] = [];

    // if unwrapping, build a throw-away ATA & point claim there
    let claimTargetTa = receiverTaA;
    let tempAcct: Keypair | null = null;

    if (unwrap) {
      tempAcct = Keypair.generate();
      signers.push(tempAcct);

      const rent =
        await this.config.provider.connection.getMinimumBalanceForRentExemption(
          165
        );

      instructions.push(
        SystemProgram.createAccount({
          fromPubkey: claimer,
          newAccountPubkey: tempAcct.publicKey,
          lamports: rent,
          space: 165,
          programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeAccountInstruction(
          tempAcct.publicKey,
          NATIVE_MINT,
          claimer
        )
      );

      claimTargetTa = tempAcct.publicKey;
    }

    // the actual claim
    const claimIx = await this.amm.methods
      .claim()
      .accounts({
        pool,
        claimer,
        receiverTaA: claimTargetTa,
        mintA,
        tokenProgramA,
      })
      .instruction();
    instructions.push(claimIx);

    // if unwrapping, close temp ATA → send SOL to receiverTaA.owner
    if (unwrap && tempAcct) {
      // fetch owner of receiverTaA
      const ownerAccountInfo =
        await this.config.connection.getParsedAccountInfo(receiverTaA);

      if (
        !ownerAccountInfo.value ||
        !("parsed" in ownerAccountInfo.value.data)
      ) {
        throw new SDKError(
          "Failed to get receiver account info",
          SDKErrorType.TransactionError
        );
      }

      const receiverOwner = ownerAccountInfo.value.data.parsed.info.owner;

      instructions.push(
        createCloseAccountInstruction(
          tempAcct.publicKey,
          new PublicKey(receiverOwner),
          claimer
        )
      );
    }

    return { instructions, signers };
  }

  /**
   * Claims royalties from a pool
   * @param {Object} opts - The parameters object
   * @param {PublicKey} opts.pool - The pool address
   * @param {Keypair} opts.claimer - The claimer's keypair
   * @param {PublicKey} opts.mintA - The mint address for the A side
   * @param {PublicKey} opts.tokenProgramA - The token program for the A side
   * @param {PublicKey} opts.receiverTaA - The receiver's token account address for the A side
   * @param {boolean} [opts.unwrap=false] - Whether to unwrap SOL if mintA is native mint
   * @returns {Promise<string>} The signature of the claim transaction
   * @throws {SDKError} If the claim fails or validation fails
   */
  async claimRoyalties({
    pool,
    claimer,
    mintA,
    tokenProgramA,
    receiverTaA,
    unwrap = false,
  }: ClaimRequest & { unwrap?: boolean }): Promise<string> {
    try {
      const { instructions, signers } = await this.buildClaimInstruction({
        pool,
        claimer: claimer.publicKey,
        mintA,
        tokenProgramA,
        receiverTaA,
        unwrap,
      });

      // Create and send the transaction
      const tx = new Transaction().add(...instructions);
      const signature = await this.config.provider.sendAndConfirm(tx, [
        claimer,
        ...signers,
      ]);

      this.config.logTx(signature, "Claim royalties");
      return signature;
    } catch (error) {
      throw new SDKError(
        "Failed to execute claim transaction",
        SDKErrorType.TransactionError,
        error
      );
    }
  }
}
