import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { VERTIGO_PROGRAMS, Network } from "../core/constants";
import type { PoolAuthority } from "../../../target/types/pool_authority";

export type PoolAuthorityConfig = {
  connection: Connection;
  wallet?: anchor.Wallet;
  network?: Network;
  commitment?: anchor.web3.Commitment;
  programId?: PublicKey;
};

/**
 * Client for interacting with the Pool Authority program
 * This is a separate client for advanced users who need pool authority features
 */
export class PoolAuthorityClient {
  public readonly connection: Connection;
  public readonly provider: anchor.AnchorProvider;
  public readonly program: anchor.Program<PoolAuthority>;
  public readonly network: Network;

  constructor(config: PoolAuthorityConfig) {
    this.connection = config.connection;
    this.network = config.network || "mainnet";
    
    // Create provider
    const wallet = config.wallet || {
      publicKey: PublicKey.default,
      signTransaction: async () => { throw new Error("Wallet not connected"); },
      signAllTransactions: async () => { throw new Error("Wallet not connected"); },
    };
    
    this.provider = new anchor.AnchorProvider(
      this.connection,
      wallet as anchor.Wallet,
      { commitment: config.commitment || "confirmed" }
    );
    
    // Initialize Pool Authority program
    const programId = config.programId || VERTIGO_PROGRAMS[this.network].POOL_AUTHORITY;
    const idl = require("../../target/idl/pool_authority.json");
    
    // Apply the same workaround as VertigoClient for Anchor issues
    const modifiedIdl = JSON.parse(JSON.stringify(idl));
    modifiedIdl.accounts = [];
    
    this.program = new anchor.Program(modifiedIdl, programId, this.provider) as anchor.Program<PoolAuthority>;
  }

  /**
   * Create a new Pool Authority client
   */
  static async load(config: PoolAuthorityConfig): Promise<PoolAuthorityClient> {
    return new PoolAuthorityClient(config);
  }

  /**
   * Derive authority PDA
   */
  deriveAuthorityPDA(owner: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("authority"), owner.toBuffer()],
      this.program.programId
    );
  }

  /**
   * Create a new pool authority
   */
  async createAuthority(
    params: {
      owner: PublicKey;
      feeRecipient?: PublicKey;
      defaultFeeRate?: number;
    }
  ): Promise<{ signature: string; authority: PublicKey }> {
    const [authority, bump] = this.deriveAuthorityPDA(params.owner);
    
    const ix = await this.program.methods
      .initialize({
        feeRecipient: params.feeRecipient || params.owner,
        defaultFeeRate: params.defaultFeeRate || 30, // 0.3%
      })
      .accounts({
        owner: params.owner,
        authority,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
    
    const tx = new Transaction().add(ix);
    const signature = await this.provider.sendAndConfirm(tx);
    
    return { signature, authority };
  }

  /**
   * Update pool authority settings
   */
  async updateAuthority(
    params: {
      authority: PublicKey;
      owner: PublicKey;
      newFeeRecipient?: PublicKey;
      newDefaultFeeRate?: number;
    }
  ): Promise<string> {
    const ix = await this.program.methods
      .update({
        feeRecipient: params.newFeeRecipient || null,
        defaultFeeRate: params.newDefaultFeeRate || null,
      })
      .accounts({
        owner: params.owner,
        authority: params.authority,
      })
      .instruction();
    
    const tx = new Transaction().add(ix);
    return await this.provider.sendAndConfirm(tx);
  }

  /**
   * Transfer ownership of pool authority
   */
  async transferOwnership(
    params: {
      authority: PublicKey;
      currentOwner: PublicKey;
      newOwner: PublicKey;
    }
  ): Promise<string> {
    const ix = await this.program.methods
      .transferOwnership()
      .accounts({
        owner: params.currentOwner,
        newOwner: params.newOwner,
        authority: params.authority,
      })
      .instruction();
    
    const tx = new Transaction().add(ix);
    return await this.provider.sendAndConfirm(tx);
  }

  /**
   * Get pool authority data
   */
  async getAuthority(authority: PublicKey): Promise<any> {
    return await this.program.account.poolAuthority.fetch(authority);
  }

  /**
   * List all authorities for an owner
   */
  async listAuthoritiesForOwner(owner: PublicKey): Promise<Array<{
    publicKey: PublicKey;
    account: any;
  }>> {
    const authorities = await this.program.account.poolAuthority.all([
      {
        memcmp: {
          offset: 8, // After discriminator
          bytes: owner.toBase58(),
        },
      },
    ]);
    return authorities;
  }

  /**
   * Check if an address has pool authority
   */
  async hasAuthority(owner: PublicKey): Promise<boolean> {
    const [authority] = this.deriveAuthorityPDA(owner);
    const accountInfo = await this.connection.getAccountInfo(authority);
    return accountInfo !== null;
  }
}