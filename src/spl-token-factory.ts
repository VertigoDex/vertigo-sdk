import { Program } from "@coral-xyz/anchor";
import * as anchor from "@coral-xyz/anchor";
import { VertigoConfig } from "./config";
import { PublicKey } from "@solana/web3.js";
import { Amm } from "../target/types/amm";
import { SplTokenFactory as SplTokenFactoryIdl } from "../target/types/spl_token_factory";
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";

import {
  InitializeRequest,
  LaunchRequest,
} from "./types/generated/spl_token_factory";
import { DevBuyArgs } from "./types/sdk";
import { getPoolPda } from "./utils/helpers";

export class SplTokenFactory {
  private factory: Program<SplTokenFactoryIdl>;
  private config: VertigoConfig;
  private amm: Program<Amm>;

  constructor(config: VertigoConfig, amm: Program<Amm>) {
    this.config = config;

    const splTokenFactoryIdl = require("../target/idl/spl_token_factory.json");

    this.factory = new Program(splTokenFactoryIdl, config.provider);
    this.amm = amm;
  }

  /**
   * Initializes a new token factory
   * @param {Object} params - The parameters object
   * @param {Keypair} params.payer - Keypair that will pay for the transaction
   * @param {Keypair} params.owner - Keypair that will own the factory
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
   * @returns {Promise<string>} Transaction signature
   */
  async initialize({
    payer,
    owner,
    mintA,
    params,
  }: InitializeRequest): Promise<string> {
    const signature = await this.factory.methods
      .initialize(params)
      .accounts({
        payer: payer.publicKey,
        owner: owner.publicKey,
        mintA,
      })
      .signers([owner, payer])
      .rpc();

    this.config.logTx(signature, "Factory creation");
    this.config.log("✅ Factory created successfully!");
    return signature;
  }

  /**
   * Launches a new trading pool from an existing factory
   * @param {Object} args - The arguments object
   * @param {Keypair} args.payer - Keypair that will pay for the transaction
   * @param {Keypair} args.owner - Keypair of the factory owner
   * @param {PublicKey} args.mintA - Keypair that will control the A side token mint
   * @param {Keypair} args.mintB - Keypair that will control the B side token mint
   * @param {Keypair} args.mintBAuthority - Keypair that will control the token mint
   * @param {PublicKey} args.tokenProgramA - Public key of the token program for the A side
   * @param {Object} args.params - Launch configuration parameters
   * @param {Object} args.params.tokenConfig - Token configuration parameters
   * @param {string} args.params.tokenConfig.name - Token name
   * @param {string} args.params.tokenConfig.symbol - Token symbol
   * @param {string} args.params.tokenConfig.uri - Token metadata URI
   * @param {anchor.BN} args.params.reference - Reference slot for the fee calculation
   * @param {PublicKey | null} args.params.privilegedSwapper - Optional privileged swapper address
   * @param {number} args.params.nonce - Nonce for the launch
   * @param {anchor.BN} [args.amount] - Optional amount of Mint A to purchase
   * @param {anchor.BN} [args.limit] - Optional limit for the initial token purchase
   * @param {Keypair} [args.dev] - Optional Keypair to receive initial dev tokens
   * @param {PublicKey} [args.devTaA] - Optional token account of the receiver for the A side
   * @returns {Promise<{ signature: string, devBuySignature: string, poolAddress: PublicKey }>} Transaction signature, dev buy signature and pool address
   */
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

    const launchTx = await this.factory.methods
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
      .rpc();

    this.config.logTx(launchTx, "Launch");

    // If dev buy is requested, add the buy instruction
    const buyTx = new anchor.web3.Transaction();
    let devBuySignature = null;

    if (amount && limit && dev && devTaA) {
      const devTaB = getAssociatedTokenAddressSync(
        mintB.publicKey,
        dev.publicKey,
        false,
        TOKEN_PROGRAM_ID
      );

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
        buyTx.add(
          createAssociatedTokenAccountInstruction(
            dev.publicKey,
            devTaB,
            dev.publicKey,
            mintB.publicKey,
            TOKEN_PROGRAM_ID
          )
        );
      }

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
          tokenProgramB: TOKEN_PROGRAM_ID,
        })
        .signers([dev])
        .instruction();

      buyTx.add(buyIx);
      devBuySignature = await this.config.provider.sendAndConfirm(buyTx, [dev]);
    }

    return {
      signature: launchTx,
      devBuySignature: devBuySignature,
      poolAddress: pool,
    };
  }
}
