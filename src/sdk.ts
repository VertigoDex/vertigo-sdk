import * as anchor from "@coral-xyz/anchor";
import { BN, type Program } from "@coral-xyz/anchor";
import { type Keypair, type Connection, PublicKey } from "@solana/web3.js";
import type { Amm } from "../target/types/amm";
import type { Factory } from "../target/types/factory";

import { POOL_SEED, type PoolConfig } from "./types";
import dotenv from "dotenv";
import { factory } from "typescript";

dotenv.config();

// TODO
/**
 * Main SDK class for interacting with the Vertigo protocol
 * @class VertigoSDK
 */
export class VertigoSDK {
  private amm: Program<Amm>;
  private factory: Program<Factory>;
  public connection: Connection;
  public wallet: anchor.Wallet;
  public logLevel: "verbose" | "tx" | "none";
  public explorer: "solscan" | "solanaExplorer" | "solanafm";

  constructor(
    connection: Connection,
    wallet: anchor.Wallet,
    logLevel: "verbose" | "tx" | "none" = "verbose",
    explorer: "solscan" | "solanaExplorer" = "solscan"
  ) {
    // Initialize anchor provider
    const provider = new anchor.AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });

    // Set anchor provider
    anchor.setProvider(provider);

    // Initialize the programs
    this.factory = new anchor.Program(
      require(process.env.PATH_TO_FACTORY_IDL as string),
      provider
    ) as Program<Factory>;

    this.amm = new anchor.Program(
      require(process.env.PATH_TO_AMM_IDL as string),
      provider
    ) as Program<Amm>;

    this.connection = connection;
    this.wallet = wallet;
    this.logLevel = logLevel;
    this.explorer = explorer;
  }

  private logTx(signature: string, operation: string) {
    if (["tx", "verbose"].includes(this.logLevel)) {
      const cluster = this.connection.rpcEndpoint.includes("devnet")
        ? "?cluster=devnet"
        : this.connection.rpcEndpoint.includes("testnet")
        ? "?cluster=testnet"
        : this.connection.rpcEndpoint.includes("127.0.0.1")
        ? "?cluster=custom&customUrl=http://127.0.0.1:8899"
        : "";
      const explorerUrl =
        this.explorer === "solscan"
          ? `https://solscan.io/tx/${signature}${cluster}`
          : `https://explorer.solana.com/tx/${signature}${cluster}`;
      console.log(`🔗 ${operation} transaction: ${explorerUrl}`);
    }
  }

  private log(message: string) {
    if (this.logLevel === "verbose") {
      console.log(message);
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
    this.log("🚀 Launching new pool...");

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

    this.log("📡 Sending pool creation transaction...");
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

    this.logTx(createSignature, "Pool creation");
    this.log("✅ Pool successfully created!");

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
      this.logTx(buySignature, "Dev buy");
    }

    return {
      signature: createSignature,
      poolAddress: pool,
    };
  }

  /**
   * Gets a quote for buying tokens from a pool
   * @param {anchor.BN} args.amount - Amount of token A to buy
   * @param {anchor.BN} args.limit - Maximum amount of token B expected to receive
   * @param {PublicKey} args.owner - Pool owner's public key
   * @param {PublicKey} args.mintA - Address of the token mint for the A side
   * @param {PublicKey} args.mintB - Address of the token mint for the B side
   * @returns {Promise<{amountB: BN, feeA: BN}>} Quote containing expected token amount and fees
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
  }): Promise<{ amountB: anchor.BN; feeA: anchor.BN }> {
    return this.amm.methods
      .quoteBuy({ amount, limit })
      .accounts({ owner, mintA, mintB })
      .view();
  }

  /**
   * Gets a quote for selling tokens to a pool
   * @param {anchor.BN} args.amount - Amount of token B to sell
   * @param {anchor.BN} args.limit - Minimum amount of token A expected to receive
   * @param {PublicKey} args.owner - Pool owner's public key
   * @param {PublicKey} args.mintA - Address of the token mint for the A side
   * @param {PublicKey} args.mintB - Address of the token mint for the B side
   * @returns {Promise<{amountA: BN, feeA: BN}>} Quote containing expected token A amount and fees
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
  }): Promise<{ amountA: anchor.BN; feeA: anchor.BN }> {
    return this.amm.methods
      .quoteSell({ amount, limit })
      .accounts({ owner, mintA, mintB })
      .view();
  }

  /**
   * Buys tokens from a pool using the bonding curve price
   * @param {Object} args - The arguments object
   * @param {PublicKey} args.owner - Address of the pool owner
   * @param {Keypair} args.user - Address of the user
   * @param {PublicKey} args.mintA - Address of the token mint for the A side
   * @param {PublicKey} args.mintB - Address of the token mint for the B side
   * @param {PublicKey} args.userTaA - Address of the user's token account for the A side
   * @param {PublicKey} args.userTaB - Address of the user's token account for the B side
   * @param {PublicKey} args.tokenProgramA - Token program for the A side
   * @param {PublicKey} args.tokenProgramB - Token program for the B side
   * @param {anchor.BN} args.amount - Amount of SOL to spend (in lamports)
   * @param {anchor.BN} args.limit - Maximum amount of token B expected to receive
   * @returns {Promise<string>} Transaction signature
   * @throws Will throw if the slippage limit is not met or if there's insufficient liquidity
   */
  async buy({
    owner,
    user,
    mintA,
    mintB,
    userTaA,
    userTaB,
    tokenProgramA,
    tokenProgramB,
    amount,
    limit,
  }: {
    owner: PublicKey;
    user: Keypair;
    mintA: PublicKey;
    mintB: PublicKey;
    userTaA: PublicKey;
    userTaB: PublicKey;
    tokenProgramA: PublicKey;
    tokenProgramB: PublicKey;
    amount: anchor.BN;
    limit: anchor.BN;
  }): Promise<string> {
    this.log("📡 Sending buy transaction...");
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

    // Wait for transaction confirmation
    const confirmation = await this.connection.confirmTransaction(signature);

    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${confirmation.value.err}`);
    }

    this.logTx(signature, "Buy");
    return signature;
  }

  /**
   * Sells tokens back to the pool at the current bonding curve price
   * @param {Object} args - The arguments object
   * @param {PublicKey} args.owner - Public key of the pool owner
   * @param {PublicKey} args.mintA - Address of the token mint for the A side
   * @param {PublicKey} args.mintB - Address of the token mint for the B side
   * @param {Keypair} args.user - User's keypair
   * @param {PublicKey} args.userTaA - Address of the user's token account for the A side
   * @param {PublicKey} args.userTaB - Address of the user's token account for the B side
   * @param {PublicKey} args.tokenProgramA - Token program for the A side
   * @param {PublicKey} args.tokenProgramB - Token program for the B side
   * @param {anchor.BN} args.amount - Amount of tokens to sell
   * @param {anchor.BN} args.limit - Maximum amount of token A expected to receive
   * @returns {Promise<string>} Transaction signature
   * @throws Will throw if the slippage limit is not met or if there's insufficient liquidity
   */
  async sell({
    owner,
    mintA,
    mintB,
    user,
    userTaA,
    userTaB,
    tokenProgramA,
    tokenProgramB,
    amount,
    limit,
  }: {
    owner: PublicKey;
    mintA: PublicKey;
    mintB: PublicKey;
    user: Keypair;
    userTaA: PublicKey;
    userTaB: PublicKey;
    tokenProgramA: PublicKey;
    tokenProgramB: PublicKey;
    amount: anchor.BN;
    limit: anchor.BN;
  }): Promise<string> {
    this.log("📡 Sending sell transaction...");
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

    this.logTx(signature, "Sell");
    this.log("✅ Sell successful!");
    return signature;
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

    this.logTx(signature, "Claim royalties");
    return signature;
  }

  /**
   * Creates a new factory
   * @param {Keypair} args.payer  - Keypair that will pay for the transaction
   * @param {Keypair} args.owner  - Keypair that will own the factory
   * @param {PublicKey} args.mint - Public key of the token mint for the A side
   * @param {Object} args.params  - Factory initialization parameters
   * @param {anchor.BN} args.params.shift - Constant product shift
   * @param {anchor.BN} params.initialTokenReserves - Initial token reserves for pools
   * @param {Object} params.feeParams - Fee parameters
   * @param {anchor.BN} params.feeParams.normalizationPeriod - Normalization period in slots
   * @param {number} params.feeParams.decay - Fee decay rate
   * @param {number} params.feeParams.royaltiesBps - Royalty fee in basis points
   * @param {Object} params.tokenParams - Token parameters
   * @param {number} params.tokenParams.decimals - Token decimals
   * @param {boolean} params.tokenParams.mutable - Whether token metadata is mutable
   * @returns {Promise<string>} Transaction signature
   */
  async createFactory({
    payer,
    owner,
    mint,
    params,
  }: {
    payer: Keypair;
    owner: Keypair;
    mint: PublicKey;
    params: {
      shift: anchor.BN;
      initialTokenReserves: anchor.BN;
      feeParams: {
        normalizationPeriod: anchor.BN;
        decay: number;
        royaltiesBps: number;
      };
      tokenParams: {
        decimals: number;
        mutable: boolean;
      };
    };
  }): Promise<string> {
    this.log("🏭 Creating new factory...");
    const signature = await this.factory.methods
      .initialize(params)
      .accounts({
        payer: payer.publicKey,
        owner: owner.publicKey,
        mintA: mint,
      })
      .signers([owner, payer])
      .rpc();

    this.logTx(signature, "Factory creation");
    this.log("✅ Factory created successfully!");
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
   * @param {PublicKey} args.tokenProgramB - Public key of the token program for the B side
   * @param {Object} args.launchCfg - Launch configuration parameters
   * @param {Object} args.launchCfg.tokenConfig - Token configuration parameters
   * @param {string} args.launchCfg.tokenConfig.name - Token name
   * @param {string} args.launchCfg.tokenConfig.symbol - Token symbol
   * @param {string} args.launchCfg.tokenConfig.uri - Token metadata URI
   * @param {number} args.launchCfg.feeFreeBuys - Number of fee-free buys allowed
   * @param {anchor.BN} [args.devBuyAmount] - Optional amount of SOL (in lamports) for initial token purchase
   * @param {Keypair} [args.dev] - Optional Keypair to receive initial dev tokens
   * @param {PublicKey} [args.devTaA] - Optional token account of the receiver for the A side
   * @param {PublicKey} [args.devTaB] - Optional token account of the receiver for the B side
   * @returns {Promise<{ signature: string, mint: PublicKey }>} Transaction signature and mint address
   */
  async launchFromFactory({
    payer,
    owner,
    mintA,
    mintB,
    mintBAuthority,
    tokenProgramA,
    tokenProgramB,
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
    tokenProgramB: PublicKey;
    launchCfg: {
      tokenConfig: {
        name: string;
        symbol: string;
        uri: string;
      };
      reference: anchor.BN;
      feeFreeBuys: number;
    };
    devBuyAmount?: anchor.BN;
    dev?: Keypair;
    devTaA?: PublicKey;
    devTaB?: PublicKey;
  }): Promise<{ signature: string }> {
    const [factory, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("factory"), owner.publicKey.toBuffer()],
      this.factory.programId
    );

    const params = {
      ...launchCfg,
      bump,
    };

    const tx = this.factory.methods
      .launch(params)
      .accounts({
        payer: payer.publicKey,
        owner: owner.publicKey,
        mintA: mintA,
        mintB: mintB.publicKey,
        mintBAuthority: mintBAuthority.publicKey,
        tokenProgramA: tokenProgramA,
        tokenProgramB: tokenProgramB,
      })
      .signers([owner, payer, mintBAuthority, mintB]);

    // Send transaction
    const launchSignature = await tx.rpc();
    // TODO combine trasnactions

    this.logTx(launchSignature, "Pool creation from factory");

    // If dev buy is requested, add the buy instruction
    if (devBuyAmount && dev && devTaA && devTaB) {
      this.log("📡 Sending transaction...");

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
          tokenProgramB: tokenProgramB,
        })
        .signers([dev])
        .rpc();

      this.logTx(signature, "Dev buy");
    }

    return {
      signature: launchSignature,
    };
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

    this.logTx(signature, "Disable pool");
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

    this.logTx(signature, "Enable pool");
    return signature;
  }
}
