import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
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
export class Token2022Factory {
  private factory: Program<Token2022FactoryIdl>;
  private config: VertigoConfig;
  private amm: Program<Amm>;

  constructor(config: VertigoConfig, amm: Program<Amm>) {
    this.config = config;

    this.amm = amm;

    const token2022FactoryIdl = require(config.token2022ProgramPath as string);

    if (config.token2022ProgramIdOverride) {
      token2022FactoryIdl.address = config.token2022ProgramIdOverride;
    }

    this.factory = new Program(token2022FactoryIdl, config.provider);
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
   * @param {anchor.BN} [args.devBuyAmount] - Optional amount of SOL (in lamports) for initial token purchase
   * @param {Keypair} [args.dev] - Optional Keypair to receive initial dev tokens
   * @param {PublicKey} [args.devTaA] - Optional token account of the receiver for the A side
   * @returns {Promise<{ signature: string, devBuySignature: string, poolAddress: PublicKey }>} Transaction signature, dev buy signature and pool address
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
   * @param {Object} args.launchCfg - Launch configuration parameters
   * @param {Object} args.launchCfg.tokenConfig - Token configuration parameters
   * @param {string} args.launchCfg.tokenConfig.name - Token name
   * @param {string} args.launchCfg.tokenConfig.symbol - Token symbol
   * @param {string} args.launchCfg.tokenConfig.uri - Token metadata URI
   * @param {number} args.launchCfg.feeFreeBuys - Number of fee-free buys allowed
   * @param {anchor.BN} args.launchCfg.reference - Reference price for the pool
   * @param {anchor.BN} [args.amount] - Optional amount of Mint A to purchase
   * @param {anchor.BN} [args.limit] - Optional limit for the initial token purchase
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

    const tx = new anchor.web3.Transaction();
    let devBuySignature = null;

    if (amount && limit && dev && devTaA) {
      // Check if the dev TaB exists, if not create it
      let userTaBExists = false;
      const devTaB = getAssociatedTokenAddressSync(
        mintB.publicKey,
        dev.publicKey,
        false,
        TOKEN_2022_PROGRAM_ID
      );
      try {
        const balance = await this.config.connection.getTokenAccountBalance(
          devTaB
        );
        userTaBExists = true;
      } catch {
        userTaBExists = false;
      }

      if (!userTaBExists) {
        tx.add(
          createAssociatedTokenAccountInstruction(
            dev.publicKey,
            devTaB,
            dev.publicKey,
            mintB.publicKey,
            TOKEN_2022_PROGRAM_ID
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
          tokenProgramB: TOKEN_2022_PROGRAM_ID,
        })
        .signers([dev])
        .instruction();

      tx.add(buyIx);
      devBuySignature = await this.config.provider.sendAndConfirm(tx, [dev]);

      this.config.logTx(devBuySignature, "Dev buy");

      return {
        signature: launchTx,
        devBuySignature: devBuySignature,
        poolAddress: pool,
      };
    }

    return {
      signature: launchTx,
      devBuySignature: null,
      poolAddress: pool,
    };
  }
}
