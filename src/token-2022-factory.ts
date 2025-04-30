import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey, TransactionInstruction } from "@solana/web3.js";
import { Token2022Factory as Token2022FactoryIdl } from "../target/types/token_2022_factory";
import { VertigoConfig } from "./config";
import * as anchor from "@coral-xyz/anchor";
import { Amm } from "../target/types/amm";
import {
  createAssociatedTokenAccountInstruction,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  InitializeRequest,
  LaunchRequest,
} from "./types/generated/token_2022_factory";
import { DevBuyArgs } from "./types/sdk";
import { getPoolPda } from "./utils";
import { SDKError, SDKErrorType } from "./types/error";

export class Token2022Factory {
  private factory: Program<Token2022FactoryIdl>;
  private config: VertigoConfig;
  private amm: Program<Amm>;

  constructor(config: VertigoConfig, amm: Program<Amm>) {
    this.config = config;

    this.amm = amm;

    const token2022FactoryIdl = require("../target/idl/token_2022_factory.json");

    this.factory = new Program(token2022FactoryIdl, config.provider);
  }

  /**
   * Builds the instruction for initializing a new token factory
   * @param {Object} params - The parameters object
   * @param {SignerLike} params.payer - Keypair that will pay for the transaction
   * @param {SignerLike} params.owner - Keypair that will own the factory
   * @param {PublicKey} params.mintA - Public key of the token mint for the A side
   * @param {Object} params.params - Factory initialization parameters
   * @param {BN} params.params.shift - Bonding curve shift parameter
   * @param {BN} params.params.initialTokenReserves - Initial token reserves
   * @param {Object} params.params.feeParams - Fee parameters
   * @param {BN} params.params.feeParams.normalizationPeriod - Fee normalization period in slots
   * @param {number} params.params.feeParams.decay - Fee decay rate
   * @param {number} params.params.feeParams.royaltiesBps - Royalties in basis points
   * @param {Object} params.params.tokenParams - Token parameters
   * @param {number} params.params.tokenParams.decimals - Token decimals
   * @param {boolean} params.params.tokenParams.mutable - Whether token metadata is mutable
   * @param {number} params.params.nonce - Initialization nonce, unique per factory
   * @returns {Promise<TransactionInstruction>} The initialization instruction
   * @throws {SDKError} Will throw if there's an error building the instruction
   */
  async buildInitializeInstruction({
    payer,
    owner,
    mintA,
    params,
  }: InitializeRequest): Promise<TransactionInstruction> {
    try {
      return await this.factory.methods
        .initialize(params)
        .accounts({
          payer: payer.publicKey,
          owner: owner.publicKey,
          mintA,
        })
        .signers([owner, payer])
        .instruction();
    } catch (error) {
      throw new SDKError(
        "Failed to build initialize instruction",
        SDKErrorType.TransactionError,
        error
      );
    }
  }

  /**
   * Builds the instruction(s) for launching a new trading pool from an existing factory
   * @param {Object} args - The arguments object
   * @param {SignerLike} args.payer - Keypair that will pay for the transaction
   * @param {SignerLike} args.owner - Keypair of the factory owner
   * @param {PublicKey} args.mintA - Keypair that will control the A side token mint
   * @param {SignerLike} args.mintB - Keypair that will control the B side token mint
   * @param {SignerLike} args.mintBAuthority - Keypair that will control the token mint
   * @param {PublicKey} args.tokenProgramA - Public key of the token program for the A side
   * @param {Object} args.params - Launch configuration parameters
   * @param {Object} args.params.tokenConfig - Token configuration parameters
   * @param {string} args.params.tokenConfig.name - Token name
   * @param {string} args.params.tokenConfig.symbol - Token symbol
   * @param {string} args.params.tokenConfig.uri - Token metadata URI
   * @param {number} args.params.tokenConfig.feeFreeBuys - Number of fee-free buys allowed
   * @param {anchor.BN} args.params.reference - Reference slot for the fee calculation
   * @param {PublicKey | null} args.params.privilegedSwapper - Optional privileged swapper address
   * @param {number} args.params.nonce - Nonce for the launch
   * @param {anchor.BN} [args.amount] - Optional amount of Mint A to purchase
   * @param {anchor.BN} [args.limit] - Optional limit for the initial token purchase
   * @param {SignerLike} [args.dev] - Optional Keypair to receive initial dev tokens
   * @param {PublicKey} [args.devTaA] - Optional token account of the receiver for the A side
   * @returns {Promise<{ launchInstructions: TransactionInstruction[], devBuyInstructions: TransactionInstruction[] | null, poolAddress: PublicKey }>} Object containing instructions and pool address
   */
  async buildLaunchInstruction({
    payer,
    owner,
    mintA,
    mintB,
    mintBAuthority,
    tokenProgramA,
    params,
    amount,
    limit,
    dev,
    devTaA,
  }: LaunchRequest & Partial<DevBuyArgs>): Promise<{
    launchInstructions: TransactionInstruction[];
    devBuyInstructions: TransactionInstruction[] | null;
    poolAddress: PublicKey;
  }> {
    try {
      const [pool, _] = getPoolPda(
        owner.publicKey,
        mintA,
        mintB.publicKey,
        this.amm.programId
      );

      const launchParams = params;
      if (!params.reference) {
        launchParams.reference = new anchor.BN(0);
      }

      // Create the launch instruction
      const launchIx = await this.factory.methods
        .launch(launchParams)
        .accounts({
          payer: payer.publicKey,
          owner: owner.publicKey,
          mintA: mintA,
          mintB: mintB.publicKey,
          mintBAuthority: mintBAuthority.publicKey,
          tokenProgramA: tokenProgramA,
        })
        .signers([owner, payer, mintBAuthority, mintB])
        .instruction();

      const launchInstructions = [launchIx];

      let devBuyInstructions: TransactionInstruction[] | null = null;

      // If dev buy is requested, build the buy instructions
      if (amount && limit && dev && devTaA) {
        const devTaB = getAssociatedTokenAddressSync(
          mintB.publicKey,
          dev.publicKey,
          false,
          TOKEN_2022_PROGRAM_ID
        );

        devBuyInstructions = [];

        // Check if dev TaB exists
        let userTaBExists = false;
        try {
          const balance = await this.config.connection.getTokenAccountBalance(
            devTaB
          );
          userTaBExists = true;
        } catch {
          userTaBExists = false;
        }

        if (!userTaBExists) {
          devBuyInstructions.push(
            createAssociatedTokenAccountInstruction(
              dev.publicKey,
              devTaB,
              dev.publicKey,
              mintB.publicKey,
              TOKEN_2022_PROGRAM_ID
            )
          );
        }

        // Add the buy instruction
        const buyIx = await this.amm.methods
          .buy({
            amount,
            limit,
          })
          .accounts({
            owner: owner.publicKey,
            user: dev.publicKey,
            mintA: mintA,
            mintB: mintB.publicKey,
            userTaA: devTaA,
            userTaB: devTaB,
            tokenProgramA: tokenProgramA,
            tokenProgramB: TOKEN_2022_PROGRAM_ID,
          })
          .signers([dev])
          .instruction();

        devBuyInstructions.push(buyIx);
      }

      return {
        launchInstructions,
        devBuyInstructions,
        poolAddress: pool,
      };
    } catch (error) {
      throw new SDKError(
        "Failed to build launch instructions",
        SDKErrorType.TransactionError,
        error
      );
    }
  }

  async initialize({
    payer,
    owner,
    mintA,
    params,
  }: InitializeRequest): Promise<string> {
    const instruction = await this.buildInitializeInstruction({
      payer,
      owner,
      mintA,
      params,
    });

    const tx = new anchor.web3.Transaction().add(instruction);
    const signature = await this.config.provider.sendAndConfirm(tx, [
      owner,
      payer,
    ]);

    this.config.logTx(signature, "Factory creation");
    this.config.log("✅ Factory created successfully!");
    return signature;
  }

  async launch({
    payer,
    owner,
    mintA,
    mintB,
    mintBAuthority,
    tokenProgramA,
    params,
    amount,
    limit,
    dev,
    devTaA,
  }: LaunchRequest & Partial<DevBuyArgs>): Promise<{
    signature: string;
    devBuySignature: string;
    poolAddress: PublicKey;
  }> {
    const { launchInstructions, devBuyInstructions, poolAddress } =
      await this.buildLaunchInstruction({
        payer,
        owner,
        mintA,
        mintB,
        mintBAuthority,
        tokenProgramA,
        params,
        amount,
        limit,
        dev,
        devTaA,
      });

    // Execute launch transaction
    const launchTx = new anchor.web3.Transaction().add(...launchInstructions);
    const launchSignature = await this.config.provider.sendAndConfirm(
      launchTx,
      [owner, payer, mintBAuthority, mintB]
    );

    this.config.logTx(launchSignature, "Launch");

    // Execute dev buy transaction if needed
    let devBuySignature = null;
    if (devBuyInstructions) {
      const buyTx = new anchor.web3.Transaction().add(...devBuyInstructions);
      devBuySignature = await this.config.provider.sendAndConfirm(buyTx, [dev]);
    }

    return {
      signature: launchSignature,
      devBuySignature: devBuySignature,
      poolAddress: poolAddress,
    };
  }
}
