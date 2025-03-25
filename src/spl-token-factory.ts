import { Program } from "@coral-xyz/anchor";
import * as anchor from "@coral-xyz/anchor";
import { VertigoConfig } from "./vertigo-config";
import { SplTokenFactory as SplTokenFactoryIdl } from "../../target/types/spl_token_factory";
import { Keypair, PublicKey } from "@solana/web3.js";
import { FactoryInitParams, FactoryLaunchParams, POOL_SEED } from "./types";
import { Amm } from "../../target/types/amm";
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";

export class SplTokenFactory {
  private factory: Program<SplTokenFactoryIdl>;
  private config: VertigoConfig;
  private amm: Program<Amm>;

  constructor(config: VertigoConfig) {
    this.config = config;
    this.factory = new Program(
      require(process.env.PATH_TO_SPL_TOKEN_FACTORY_IDL as string),
      config.provider
    );
    this.amm = new Program(
      require(process.env.PATH_TO_AMM_IDL as string),
      config.provider
    ) as Program<Amm>;
  }

  async initialize({
    payer,
    owner,
    mint,
    params,
  }: {
    payer: Keypair;
    owner: Keypair;
    mint: PublicKey;
    params: FactoryInitParams;
  }): Promise<string> {
    this.config.log("🏭 Creating new factory...");
    const signature = await this.factory.methods
      .initialize(params)
      .accounts({
        payer: payer.publicKey,
        owner: owner.publicKey,
        mintA: mint,
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
   * @param {PublicKey} [args.devTaB] - Optional token account of the receiver for the B side
   * @returns {Promise<{ signature: string, mint: PublicKey }>} Transaction signature and mint address
   */
  async launch({
    payer,
    owner,
    mintA,
    mintB,
    mintBAuthority,
    tokenProgramA,
    launchCfg,
    devBuyAmount,
    dev,
    devTaA,
    devTaB,
  }: {
    payer: Keypair;
    owner: Keypair;
    mintA: PublicKey;
    mintB: Keypair;
    mintBAuthority: Keypair;
    tokenProgramA: PublicKey;
    launchCfg: FactoryLaunchParams;
    devBuyAmount?: anchor.BN;
    dev?: Keypair;
    devTaA?: PublicKey;
    devTaB?: PublicKey;
  }): Promise<{
    signature: string;
    poolAddress: PublicKey;
  }> {
    const [factory, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("factory"), owner.publicKey.toBuffer()],
      this.factory.programId
    );

    const [pool, _] = PublicKey.findProgramAddressSync(
      [
        Buffer.from(POOL_SEED),
        owner.publicKey.toBuffer(),
        mintA.toBuffer(),
        mintB.publicKey.toBuffer(),
      ],
      this.amm.programId
    );

    const params = {
      ...launchCfg,
      bump,
    };

    if (!params.reference) {
      params.reference = new anchor.BN(0);
    }

    const tx = this.factory.methods
      .launch(params)
      .accounts({
        payer: payer.publicKey,
        owner: owner.publicKey,
        mintA: mintA,
        mintB: mintB.publicKey,
        mintBAuthority: mintBAuthority.publicKey,
        tokenProgramA: tokenProgramA,
      })
      .signers([owner, payer, mintBAuthority, mintB]);

    // Send transaction
    const launchSignature = await tx.rpc();
    // TODO combine trasnactions

    this.config.logTx(launchSignature, "Pool creation from factory");

    // If dev buy is requested, add the buy instruction
    if (devBuyAmount && dev && devTaA && devTaB) {
      this.config.log("📡 Sending transaction...");

      const signature = await this.amm.methods
        .buy({
          amount: devBuyAmount,
          limit: new anchor.BN(0),
        })
        .accounts({
          user: dev.publicKey,
          mintA: mintA,
          mintB: mintB.publicKey,
          userTaA: devTaA,
          userTaB: devTaB,
          tokenProgramA: tokenProgramA,
          tokenProgramB: TOKEN_PROGRAM_ID,
        })
        .signers([dev])
        .rpc();

      this.config.logTx(signature, "Dev buy");
    }

    return {
      signature: launchSignature,
      poolAddress: pool,
    };
  }
}
