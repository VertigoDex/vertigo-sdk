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

    const splTokenFactoryIdl = require(config.splTokenProgramPath as string);

    if (config.splTokenProgramIdOverride) {
      splTokenFactoryIdl.address = config.splTokenProgramIdOverride;
    }

    this.factory = new Program(splTokenFactoryIdl, config.provider);
    this.amm = amm;
  }

  async initialize({
    payer,
    owner,
    mintA,
    params,
  }: InitializeRequest): Promise<string> {
    this.config.log("🏭 Creating new factory...");
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
   * @param {Object} args.launchCfg - Launch configuration parameters
   * @param {Object} args.launchCfg.tokenConfig - Token configuration parameters
   * @param {string} args.launchCfg.tokenConfig.name - Token name
   * @param {string} args.launchCfg.tokenConfig.symbol - Token symbol
   * @param {string} args.launchCfg.tokenConfig.uri - Token metadata URI
   * @param {number} args.launchCfg.feeFreeBuys - Number of fee-free buys allowed
   * @param {anchor.BN} args.launchCfg.reference - Reference price for the pool
   * @param {anchor.BN} [args.devBuyAmount] - Optional amount of SOL (in lamports) for initial token purchase
   * @param {Keypair} [args.dev] - Optional Keypair to receive initial dev tokens
   * @param {PublicKey} [args.devTaA] - Optional token account of the receiver for the A side
   * @returns {Promise<{ signature: string, mint: PublicKey }>} Transaction signature and mint address
   */
  async launch({
    payer,
    owner,
    mintA,
    mintB,
    mintBAuthority,
    tokenProgramA,
    params,
    devBuyAmount,
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

    if (devBuyAmount && dev && devTaA) {
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
          amount: devBuyAmount,
          limit: new anchor.BN(0),
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
