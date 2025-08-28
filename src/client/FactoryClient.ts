import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair, Transaction, TransactionInstruction } from "@solana/web3.js";
import { VertigoClient } from "./VertigoClient";
import { TransactionOptions } from "../types/client";
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";

export type TokenMetadata = {
  name: string;
  symbol: string;
  uri?: string;
  decimals?: number;
};

export type LaunchTokenParams = {
  metadata: TokenMetadata;
  supply: number | anchor.BN;
  useToken2022?: boolean;
  mintAuthority?: PublicKey;
  freezeAuthority?: PublicKey;
};

export type LaunchTokenWithPoolParams = LaunchTokenParams & {
  initialMarketCap: number;
  royaltiesBps: number;
  launchTime?: anchor.BN;
};

export class FactoryClient {
  constructor(private client: VertigoClient) {}

  /**
   * Check if factories are available
   */
  isFactoryAvailable(useToken2022: boolean = false): boolean {
    if (useToken2022) {
      return !!this.client.token2022FactoryProgram;
    }
    return !!this.client.splTokenFactoryProgram;
  }

  /**
   * Launch a new SPL token
   */
  async launchToken(
    params: LaunchTokenParams,
    options?: TransactionOptions
  ): Promise<{
    signature: string;
    mintAddress: PublicKey;
  }> {
    if (!this.client.isWalletConnected()) {
      throw new Error("Wallet not connected");
    }

    const factoryProgram = params.useToken2022
      ? this.client.token2022FactoryProgram
      : this.client.splTokenFactoryProgram;

    if (!factoryProgram) {
      throw new Error(
        `${params.useToken2022 ? "Token2022" : "SPL"} factory program not initialized`
      );
    }

    const payer = this.client.wallet!.publicKey;
    const mint = Keypair.generate();
    
    const supply = typeof params.supply === "number"
      ? new anchor.BN(params.supply)
      : params.supply;

    const decimals = params.metadata.decimals ?? 9;

    // Build launch instruction
    const launchIx = await factoryProgram.methods
      .launch({
        name: params.metadata.name,
        symbol: params.metadata.symbol,
        uri: params.metadata.uri || "",
        decimals,
        supply,
      })
      .accounts({
        payer,
        mint: mint.publicKey,
        mintAuthority: params.mintAuthority || payer,
        freezeAuthority: params.freezeAuthority || payer,
        tokenProgram: params.useToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .instruction();

    const tx = new Transaction();
    
    // Add priority fee if specified
    if (options?.priorityFee && options.priorityFee !== "auto") {
      tx.add(
        anchor.web3.ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: options.priorityFee,
        })
      );
    }
    
    tx.add(launchIx);

    const signature = await this.client.provider.sendAndConfirm(
      tx,
      [mint],
      {
        skipPreflight: options?.skipPreflight ?? this.client.getConfig().skipPreflight,
        commitment: options?.commitment ?? this.client.getConfig().commitment,
      }
    );

    return {
      signature,
      mintAddress: mint.publicKey,
    };
  }

  /**
   * Launch token and create pool in single transaction
   */
  async launchTokenWithPool(
    params: LaunchTokenWithPoolParams,
    options?: TransactionOptions
  ): Promise<{
    signature: string;
    mintAddress: PublicKey;
    poolAddress: PublicKey;
  }> {
    if (!this.client.isWalletConnected()) {
      throw new Error("Wallet not connected");
    }

    // First launch the token
    const { mintAddress } = await this.launchToken(
      {
        metadata: params.metadata,
        supply: params.supply,
        useToken2022: params.useToken2022,
        mintAuthority: params.mintAuthority,
        freezeAuthority: params.freezeAuthority,
      },
      options
    );

    // Then create the pool
    const { signature, poolAddress } = await this.client.pools.createPool(
      {
        mintA: NATIVE_MINT, // SOL
        mintB: mintAddress,
        initialMarketCap: params.initialMarketCap,
        royaltiesBps: params.royaltiesBps,
        launchTime: params.launchTime,
      },
      options
    );

    return {
      signature,
      mintAddress,
      poolAddress,
    };
  }

  /**
   * Get factory configuration
   */
  async getFactoryConfig(useToken2022: boolean = false): Promise<any> {
    const factoryProgram = useToken2022
      ? this.client.token2022FactoryProgram
      : this.client.splTokenFactoryProgram;

    if (!factoryProgram) {
      throw new Error(
        `${useToken2022 ? "Token2022" : "SPL"} factory program not initialized`
      );
    }

    // Find factory PDA
    const [factoryPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("factory")],
      factoryProgram.programId
    );

    try {
      const factory = await factoryProgram.account.factory.fetch(factoryPda);
      return factory;
    } catch (error) {
      console.error("Failed to fetch factory config:", error);
      return null;
    }
  }

  /**
   * Initialize factory (admin only)
   */
  async initializeFactory(
    params: {
      authority: PublicKey;
      feeReceiver: PublicKey;
      creationFee: anchor.BN;
      useToken2022?: boolean;
    },
    options?: TransactionOptions
  ): Promise<string> {
    if (!this.client.isWalletConnected()) {
      throw new Error("Wallet not connected");
    }

    const factoryProgram = params.useToken2022
      ? this.client.token2022FactoryProgram
      : this.client.splTokenFactoryProgram;

    if (!factoryProgram) {
      throw new Error(
        `${params.useToken2022 ? "Token2022" : "SPL"} factory program not initialized`
      );
    }

    const payer = this.client.wallet!.publicKey;

    const tx = await factoryProgram.methods
      .initialize({
        authority: params.authority,
        feeReceiver: params.feeReceiver,
        creationFee: params.creationFee,
      })
      .accounts({
        payer,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .transaction();

    if (options?.priorityFee && options.priorityFee !== "auto") {
      tx.add(
        anchor.web3.ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: options.priorityFee,
        })
      );
    }

    return await this.client.provider.sendAndConfirm(tx, [], {
      skipPreflight: options?.skipPreflight ?? this.client.getConfig().skipPreflight,
      commitment: options?.commitment ?? this.client.getConfig().commitment,
    });
  }

  /**
   * Get tokens created by factory
   */
  async getFactoryTokens(
    creator?: PublicKey,
    useToken2022: boolean = false
  ): Promise<Array<{
    mint: PublicKey;
    creator: PublicKey;
    name: string;
    symbol: string;
    supply: anchor.BN;
    timestamp: anchor.BN;
  }>> {
    const factoryProgram = useToken2022
      ? this.client.token2022FactoryProgram
      : this.client.splTokenFactoryProgram;

    if (!factoryProgram) {
      throw new Error(
        `${useToken2022 ? "Token2022" : "SPL"} factory program not initialized`
      );
    }

    const filters: any[] = [];
    if (creator) {
      filters.push({
        memcmp: {
          offset: 8, // After discriminator
          bytes: creator.toBase58(),
        },
      });
    }

    // This would fetch token records from the factory program
    // Implementation depends on the actual factory program structure
    return [];
  }
}