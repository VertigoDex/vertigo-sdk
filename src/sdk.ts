import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Vertigo } from "../target/types/vertigo";
import { PublicKey, Keypair, Connection } from "@solana/web3.js";
import {
  createAssociatedTokenAccount,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import { PoolConfig } from "./types";

/**
 * Main SDK class for interacting with the Vertigo protocol
 * @class VertigoSDK
 */
export class VertigoSDK {
  private program: Program<Vertigo>;
  private connection: Connection;
  private wallet: anchor.Wallet;

  constructor(connection: Connection, wallet: anchor.Wallet) {
    // Initialize anchor provider
    const provider = new anchor.AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });

    // Get program
    this.program = new Program(require("../target/idl/vertigo.json"), provider);

    this.connection = connection;
    this.wallet = wallet;
  }

  private logTx(signature: string, operation: string) {
    console.log(
      `🔗 ${operation} transaction: https://explorer.solana.com/tx/${signature}`
    );
  }

  /**
   * Launches a new trading pool with the specified configuration
   * @param {PoolConfig} cfg - Pool configuration parameters including bonding curve constant and fee structure
   * @param {Keypair} payer - Keypair that will pay for the transaction
   * @param {Keypair} mintAuthority - Keypair with authority over the token mint
   * @param {PublicKey} mint - Public key of the token mint
   * @param {PublicKey} deployer - Public key of the pool deployer
   * @param {PublicKey} royaltiesOwner - Public key that will receive royalty fees
   * @param {anchor.BN} [devBuyAmount] - Optional amount of SOL (in lamports) for initial token purchase
   * @param {PublicKey} [dev] - Optional public key to receive initial dev tokens
   * @returns {Promise<{
   *   signature: string,
   *   poolAddress: PublicKey,
   *   mintAddress: PublicKey,
   *   vaultAddress: PublicKey
   * }>} Object containing transaction signature and relevant addresses
   */
  async launchPool(
    cfg: PoolConfig,
    payer: Keypair,
    mintAuthority: Keypair,
    mint: PublicKey,
    deployer: PublicKey,
    royaltiesOwner: PublicKey,
    devBuyAmount?: anchor.BN,
    dev?: PublicKey
  ): Promise<{
    signature: string;
    poolAddress: PublicKey;
    mintAddress: PublicKey;
    vaultAddress: PublicKey;
  }> {
    const POOL_SEED = "pool";

    console.log("🚀 Launching new pool...");
    console.log(`💎 Token mint address: ${mint.toString()}`);

    // Find pool PDA
    console.log("🔍 Deriving pool PDA...");
    const [poolPda, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from(POOL_SEED), mint.toBuffer()],
      this.program.programId
    );

    // Get vault ATA
    const vault = await getAssociatedTokenAddress(mint, poolPda, true);

    // If dev buy is requested, create dev ATA and update fee exempt buys
    let devAta: PublicKey | undefined;
    if (devBuyAmount) {
      console.log(
        `💰 Setting up dev buy for ${devBuyAmount.toString()} lamports...`
      );
      devAta = await getAssociatedTokenAddress(mint, dev, true);

      // Create the ATA if it doesn't exist
      try {
        await createAssociatedTokenAccount(this.connection, payer, mint, dev);
      } catch (e) {
        // ATA already exists
      }

      // Update fee params to include one fee exempt buy
      cfg.feeParams.feeExemptBuys = 1;
    }

    // Prepare pool creation params
    const params = {
      ...cfg,
      bump,
    };

    // Create the pool
    const tx = this.program.methods.create(params).accounts({
      deployer,
      royaltiesOwner,
      mint,
      mintAuthority: mintAuthority.publicKey,
    });

    // If dev buy is requested, add the buy instruction
    if (devBuyAmount && devAta) {
      tx.postInstructions([
        await this.program.methods
          .buy({
            amount: devBuyAmount,
            limit: new anchor.BN(0),
          })
          .accounts({
            pool: poolPda,
            mint: mint,
            vault: vault,
            user: dev,
            program: this.program.programId,
          })
          .instruction(),
      ]);
    }

    // Send transaction
    console.log("📡 Sending transaction...");
    const signature = await tx.signers([payer, mintAuthority]).rpc();
    this.logTx(signature, "Pool creation");
    console.log("✅ Pool successfully created!");

    return {
      signature,
      poolAddress: poolPda,
      mintAddress: mint,
      vaultAddress: vault,
    };
  }

  /**
   * Buys tokens from a pool using the bonding curve price
   * @param {PublicKey} pool - Address of the trading pool
   * @param {Keypair} payer - Keypair that will pay for the transaction
   * @param {Keypair} user - Keypair that will receive the tokens
   * @param {PublicKey} mint - Address of the token mint
   * @param {anchor.BN} amount - Amount of SOL to spend (in lamports)
   * @param {anchor.BN} [limit=new anchor.BN(0)] - Minimum amount of tokens to receive (slippage protection)
   * @returns {Promise<string>} Transaction signature
   * @throws Will throw if the slippage limit is not met or if there's insufficient liquidity
   */
  async buy(
    pool: PublicKey,
    payer: Keypair,
    user: Keypair,
    mint: PublicKey,
    amount: anchor.BN,
    limit: anchor.BN = new anchor.BN(0)
  ): Promise<string> {
    const vault = await getAssociatedTokenAddress(mint, pool, true);

    console.log(`🛍️  Buying tokens with ${amount.toString()} lamports...`);
    console.log(`📊 Slippage limit: ${limit.toString()} tokens`);

    // Create user ATA if it doesn't exist
    console.log("🔍 Checking token account...");
    try {
      await createAssociatedTokenAccount(
        this.connection,
        this.wallet.payer,
        mint,
        this.wallet.publicKey
      );
    } catch (e) {
      // ATA already exists
    }

    console.log("📡 Sending buy transaction...");
    const signature = await this.program.methods
      .buy({
        amount,
        limit: limit,
      })
      .accounts({
        pool,
        mint,
        vault,
        user: user.publicKey,
        program: this.program.programId,
      })
      .signers([payer, user])
      .rpc();
    this.logTx(signature, "Buy");
    console.log("✅ Buy successful!");
    return signature;
  }

  /**
   * Sells tokens back to the pool at the current bonding curve price
   * @param {PublicKey} pool - Address of the trading pool
   * @param {Keypair} payer - Keypair that will pay for the transaction
   * @param {Keypair} user - Keypair that owns the tokens to sell
   * @param {PublicKey} mint - Address of the token mint
   * @param {anchor.BN} amount - Amount of tokens to sell
   * @param {anchor.BN} [limit=new anchor.BN(0)] - Minimum amount of SOL to receive (slippage protection)
   * @returns {Promise<string>} Transaction signature
   * @throws Will throw if the slippage limit is not met or if there's insufficient liquidity
   */
  async sell(
    pool: PublicKey,
    payer: Keypair,
    user: Keypair,
    mint: PublicKey,
    amount: anchor.BN,
    limit: anchor.BN = new anchor.BN(0)
  ): Promise<string> {
    console.log(`💱 Selling ${amount.toString()} tokens...`);
    console.log(`📊 Slippage limit: ${limit.toString()} lamports`);

    const vault = await getAssociatedTokenAddress(mint, pool, true);

    console.log("📡 Sending sell transaction...");
    const signature = await this.program.methods
      .sell({
        amount,
        limit,
      })
      .accounts({
        pool,
        mint,
        vault,
        user: user.publicKey,
        program: this.program.programId,
      })
      .signers([payer, user])
      .rpc();

    this.logTx(signature, "Sell");
    console.log("✅ Sell successful!");
    return signature;
  }

  /**
   * Claims accumulated royalty fees from a pool
   * @param {PublicKey} pool - Address of the trading pool
   * @param {Keypair} payer - Keypair that will pay for the transaction
   * @param {Keypair} claimer - Keypair authorized to claim royalties (must be royalties owner)
   * @param {PublicKey} [receiver] - Optional address to receive the royalties (defaults to wallet address)
   * @returns {Promise<string>} Transaction signature
   * @throws Will throw if claimer is not the authorized royalties owner
   */
  async claimRoyalties(
    pool: PublicKey,
    payer: Keypair,
    claimer: Keypair,
    receiver: PublicKey = this.wallet.publicKey
  ): Promise<string> {
    return await this.program.methods
      .claim()
      .accounts({
        pool,
        claimer: claimer.publicKey,
        receiver,
      })
      .signers([payer, claimer])
      .rpc();
  }

  /**
   * Fetches the current state of a trading pool
   * @param {PublicKey} pool - Address of the trading pool
   * @returns {Promise<any>} Pool state including token reserves, fees, and other parameters
   * @throws Will throw if the pool address is invalid or doesn't exist
   */
  async getPoolState(pool: PublicKey): Promise<any> {
    console.log(`🔍 Fetching pool state for ${pool.toString()}...`);
    return await this.program.account.pool.fetch(pool);
  }
}
