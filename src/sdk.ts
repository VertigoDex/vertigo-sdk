import * as anchor from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import type { Amm } from "../../target/types/amm";
import { SDKError, SDKErrorType } from "./types/error";
import { getPoolPda } from "./utils/helpers";
import { VertigoConfig } from "./config";
import { defaultConfig } from "./utils/config";
import { SDKConfig } from "./types/sdk";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createCloseAccountInstruction,
  createInitializeAccountInstruction,
  getAssociatedTokenAddressSync,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

import {
  BuyRequest,
  ClaimRequest,
  CreateRequest,
  QuoteBuyRequest,
  QuoteSellRequest,
  SellRequest,
  SwapResponse,
} from "./types/generated/amm";

/**
 * Main SDK class for interacting with the Vertigo protocol
 * @class VertigoSDK
 */
export class VertigoSDK {
  private config: VertigoConfig;
  private amm: anchor.Program<Amm>;
  public programId: PublicKey;

  constructor(
    provider: anchor.AnchorProvider,
    sdkConfig: SDKConfig = defaultConfig
  ) {
    try {
      this.config = new VertigoConfig(provider, sdkConfig);

      const ammIdl = require("../../target/idl/amm.json");
      this.amm = new anchor.Program(
        ammIdl,
        this.config.provider
      ) as anchor.Program<Amm>;
      this.programId = this.amm.programId;
    } catch (error) {
      throw new SDKError(
        "Failed to initialize SDK",
        SDKErrorType.InitializationError,
        error
      );
    }
  }

  /**
   * Gets the pool address for given parameters
   * @param {PublicKey} owner - The pool owner's public key
   * @param {PublicKey} mintA - The mint address for the A side
   * @param {PublicKey} mintB - The mint address for the B side
   * @returns {PublicKey} The pool address
   */
  getPoolAddress(
    owner: PublicKey,
    mintA: PublicKey,
    mintB: PublicKey
  ): PublicKey {
    const [pool] = getPoolPda(owner, mintA, mintB, this.programId);
    return pool;
  }

  /**
   * Builds the instruction(s) for creating a new pool
   * @param {CreateRequest} request - The create request parameters
   * @param {CreateMissingAccountsOptions} options - Options for creating missing accounts
   * @returns {Promise<TransactionInstruction[]>} Array of instructions needed for the create operation
   * @throws {SDKError} Will throw if there's an error building the instructions
   */
  async createInstruction(
    request: CreateRequest,
    options: { createMissingAccounts?: boolean } = {}
  ): Promise<TransactionInstruction[]> {
    const instructions: TransactionInstruction[] = [];

    try {
      // Create the pool instruction
      const createIx = await this.amm.methods
        .create(request.params)
        .accounts({
          payer: request.payer.publicKey,
          owner: request.owner.publicKey,
          tokenWalletAuthority: request.tokenWalletAuthority.publicKey,
          tokenWalletB: request.tokenWalletB,
          mintA: request.mintA,
          mintB: request.mintB,
          tokenProgramA: request.tokenProgramA,
          tokenProgramB: request.tokenProgramB,
        })
        .instruction();

      instructions.push(createIx);
      return instructions;
    } catch (error) {
      throw new SDKError(
        "Failed to build create instruction",
        SDKErrorType.TransactionError,
        error
      );
    }
  }

  /**
   * Creates a new pool
   * @param {CreateRequest} request - The create request parameters
   * @param {CreateMissingAccountsOptions} options - Options for creating missing accounts
   * @returns {Promise<string>} The signature of the create transaction
   * @throws {SDKError} If the create fails
   */
  async create(
    request: CreateRequest,
    options: { createMissingAccounts?: boolean } = {}
  ): Promise<string> {
    try {
      const instructions = await this.createInstruction(request, options);
      const tx = new Transaction().add(...instructions);
      const signature = await this.config.provider.sendAndConfirm(tx, [
        request.payer,
        request.owner,
        request.tokenWalletAuthority,
      ]);

      this.config.logTx(signature, "Create pool");
      return signature;
    } catch (error) {
      throw new SDKError(
        "Failed to execute create transaction",
        SDKErrorType.TransactionError,
        error
      );
    }
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
   * @param {BuyRequest} request - The buy request parameters
   * @param {CreateMissingAccountsOptions} options - Options for creating missing accounts
   * @returns {Promise<TransactionInstruction[]>} Array of instructions needed for the buy operation
   * @throws {SDKError} Will throw if there's an error building the instructions
   */
  async buyInstruction(
    request: BuyRequest,
    options: { createMissingAccounts?: boolean } = {}
  ): Promise<TransactionInstruction[]> {
    const { createMissingAccounts = false } = options;
    const instructions: TransactionInstruction[] = [];

    try {
      // Derive receiving token account address if not provided
      const userTaB =
        request.userTaB ||
        getAssociatedTokenAddressSync(
          request.mintB,
          request.user.publicKey,
          false,
          request.tokenProgramB
        );

      if (createMissingAccounts) {
        // Create associated token account idempotently
        instructions.push(
          createAssociatedTokenAccountIdempotentInstruction(
            request.user.publicKey,
            userTaB,
            request.user.publicKey,
            request.mintB,
            request.tokenProgramB
          )
        );
      }

      // Add the buy instruction
      const buyIx = await this.amm.methods
        .buy(request.params)
        .accounts({
          owner: request.owner,
          user: request.user.publicKey,
          mintA: request.mintA,
          mintB: request.mintB,
          userTaA: request.userTaA,
          userTaB,
          tokenProgramA: request.tokenProgramA,
          tokenProgramB: request.tokenProgramB,
        })
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
   * @param {SellRequest} request - The sell request parameters
   * @param {CreateMissingAccountsOptions} options - Options for creating missing accounts
   * @returns {Promise<TransactionInstruction[]>} Array of instructions needed for the sell operation
   * @throws {SDKError} Will throw if there's an error building the instructions
   */
  async sellInstruction(
    request: SellRequest,
    options: { createMissingAccounts?: boolean } = {}
  ): Promise<TransactionInstruction[]> {
    const { createMissingAccounts = false } = options;
    const instructions: TransactionInstruction[] = [];

    try {
      // Derive receiving token account address if not provided
      const userTaA =
        request.userTaA ||
        getAssociatedTokenAddressSync(
          request.mintA,
          request.user.publicKey,
          false,
          request.tokenProgramA
        );

      if (createMissingAccounts) {
        // Create associated token account idempotently
        instructions.push(
          createAssociatedTokenAccountIdempotentInstruction(
            request.user.publicKey,
            userTaA,
            request.user.publicKey,
            request.mintA,
            request.tokenProgramA
          )
        );
      }

      // Add the sell instruction
      const sellIx = await this.amm.methods
        .sell(request.params)
        .accounts({
          owner: request.owner,
          user: request.user.publicKey,
          mintA: request.mintA,
          mintB: request.mintB,
          userTaA,
          userTaB: request.userTaB,
          tokenProgramA: request.tokenProgramA,
          tokenProgramB: request.tokenProgramB,
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

  /**
   * Buys tokens from a pool
   * @param {BuyRequest} request - The buy request parameters
   * @param {CreateMissingAccountsOptions} options - Options for creating missing accounts
   * @returns {Promise<string>} The signature of the buy transaction
   * @throws {SDKError} If the buy fails
   */
  async buy(
    request: BuyRequest,
    options: { createMissingAccounts?: boolean } = {}
  ): Promise<string> {
    try {
      const instructions = await this.buyInstruction(request, options);
      const tx = new Transaction().add(...instructions);
      const signature = await this.config.provider.sendAndConfirm(tx, [
        request.user,
      ]);

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
   * Sells tokens to a pool
   * @param {SellRequest} request - The sell request parameters
   * @param {CreateMissingAccountsOptions} options - Options for creating missing accounts
   * @returns {Promise<string>} The signature of the sell transaction
   * @throws {SDKError} If the sell fails
   */
  async sell(
    request: SellRequest,
    options: { createMissingAccounts?: boolean } = {}
  ): Promise<string> {
    try {
      const instructions = await this.sellInstruction(request, options);
      const tx = new Transaction().add(...instructions);
      const signature = await this.config.provider.sendAndConfirm(tx, [
        request.user,
      ]);

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
   * @param {ClaimRequest} request - The claim request parameters
   * @param {ClaimOptions} options - Options for the claim operation
   * @returns {Promise<{instructions: TransactionInstruction[], signers: Keypair[]}>} Object containing instructions and signers needed for the claim operation
   * @throws {SDKError} Will throw if there's an error building the instructions
   */
  async claimInstruction(
    request: ClaimRequest,
    options: { unwrap?: boolean } = {}
  ): Promise<{
    instructions: TransactionInstruction[];
    signers: Keypair[];
  }> {
    const { unwrap = false } = options;

    if (unwrap && !request.mintA.equals(NATIVE_MINT)) {
      throw new Error("unwrap=true only valid for wSOL");
    }

    const instructions: TransactionInstruction[] = [];
    const signers: Keypair[] = [];

    // if unwrapping, build a throw-away ATA & point claim there
    let claimTargetTa = request.receiverTaA;
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
          fromPubkey: request.claimer.publicKey,
          newAccountPubkey: tempAcct.publicKey,
          lamports: rent,
          space: 165,
          programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeAccountInstruction(
          tempAcct.publicKey,
          NATIVE_MINT,
          request.claimer.publicKey
        )
      );

      claimTargetTa = tempAcct.publicKey;
    }

    // the actual claim
    const claimIx = await this.amm.methods
      .claim()
      .accounts({
        pool: request.pool,
        claimer: request.claimer.publicKey,
        receiverTaA: claimTargetTa,
        mintA: request.mintA,
        tokenProgramA: request.tokenProgramA,
      })
      .instruction();
    instructions.push(claimIx);

    // if unwrapping, close temp ATA → send SOL to receiverTaA.owner
    if (unwrap && tempAcct) {
      // fetch owner of receiverTaA
      const ownerAccountInfo =
        await this.config.connection.getParsedAccountInfo(request.receiverTaA);

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
          request.claimer.publicKey
        )
      );
    }

    return { instructions, signers };
  }

  /**
   * Claims royalties from a pool
   * @param {ClaimRequest} request - The claim request parameters
   * @param {ClaimOptions} options - Options for the claim operation
   * @returns {Promise<string>} The signature of the claim transaction
   * @throws {SDKError} If the claim fails or validation fails
   */
  async claim(
    request: ClaimRequest,
    options: { unwrap?: boolean } = {}
  ): Promise<string> {
    try {
      const { instructions, signers } = await this.claimInstruction(
        request,
        options
      );

      // Create and send the transaction
      const tx = new Transaction().add(...instructions);
      const signature = await this.config.provider.sendAndConfirm(tx, [
        request.claimer,
        ...signers,
      ]);

      this.config.logTx(signature, "Claim");
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
