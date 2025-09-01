import { Connection, PublicKey, TransactionInstruction, Transaction, Keypair } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { BorshCoder } from '@coral-xyz/anchor';
import type { Idl } from '@coral-xyz/anchor';

/**
 * Direct program utilities to bypass Anchor Program class issues
 * Uses raw IDL and manual instruction building
 */

export class DirectProgramClient {
  private connection: Connection;
  private programId: PublicKey;
  private idl: Idl | null = null;
  private coder: BorshCoder | null = null;

  constructor(connection: Connection, programId: PublicKey, idl?: Idl) {
    this.connection = connection;
    this.programId = programId;
    if (idl) {
      this.idl = idl;
      this.coder = new BorshCoder(idl);
    }
  }

  /**
   * Check if IDL is configured
   */
  hasIdl(): boolean {
    return this.idl !== null;
  }

  /**
   * Set IDL for instruction encoding
   */
  setIdl(idl: Idl) {
    this.idl = idl;
    this.coder = new BorshCoder(idl);
  }

  /**
   * Build instruction manually
   */
  buildInstruction(
    instructionName: string,
    args: any,
    accounts: Array<{
      pubkey: PublicKey;
      isSigner: boolean;
      isWritable: boolean;
    }>
  ): TransactionInstruction {
    if (!this.coder || !this.idl) {
      throw new Error('IDL not set');
    }

    // Find instruction in IDL
    const instruction = this.idl.instructions?.find(ix => ix.name === instructionName);
    if (!instruction) {
      throw new Error(`Instruction ${instructionName} not found in IDL`);
    }

    // Encode instruction data
    const data = this.coder.instruction.encode(instructionName, args);

    return new TransactionInstruction({
      keys: accounts,
      programId: this.programId,
      data,
    });
  }

  /**
   * Fetch account data and decode
   */
  async fetchAccount<T>(accountAddress: PublicKey, accountType: string): Promise<T | null> {
    try {
      const accountInfo = await this.connection.getAccountInfo(accountAddress);
      if (!accountInfo || !this.coder) {
        return null;
      }

      // Decode account data
      const decoded = this.coder.accounts.decode(accountType, accountInfo.data);
      return decoded as T;
    } catch (error) {
      console.error(`Error fetching account ${accountType}:`, error);
      return null;
    }
  }

  /**
   * Get program account info
   */
  async getProgramInfo() {
    const accountInfo = await this.connection.getAccountInfo(this.programId);
    return {
      exists: !!accountInfo,
      executable: accountInfo?.executable || false,
      owner: accountInfo?.owner.toBase58(),
      dataLength: accountInfo?.data.length || 0,
    };
  }
}

/**
 * Helper to derive PDAs
 */
export class PDADeriver {
  /**
   * Derive pool PDA
   */
  static derivePool(
    owner: PublicKey,
    mintA: PublicKey,
    mintB: PublicKey,
    programId: PublicKey
  ): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from('pool'),
        owner.toBuffer(),
        mintA.toBuffer(),
        mintB.toBuffer(),
      ],
      programId
    );
  }

  /**
   * Derive vault PDA for a pool
   */
  static deriveVault(
    pool: PublicKey,
    mint: PublicKey,
    programId: PublicKey
  ): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        pool.toBuffer(),
        mint.toBuffer(),
      ],
      programId
    );
  }
}

/**
 * Transaction builder helper
 */
export class TransactionBuilder {
  private instructions: TransactionInstruction[] = [];
  private signers: Keypair[] = [];

  addInstruction(instruction: TransactionInstruction): this {
    this.instructions.push(instruction);
    return this;
  }

  addSigner(signer: Keypair): this {
    this.signers.push(signer);
    return this;
  }

  async build(connection: Connection, payer: PublicKey): Promise<Transaction> {
    const transaction = new Transaction();
    
    // Add recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = payer;
    
    // Add all instructions
    for (const instruction of this.instructions) {
      transaction.add(instruction);
    }
    
    return transaction;
  }

  getSigners(): Keypair[] {
    return this.signers;
  }
}

/**
 * Account finder utilities
 */
export class AccountFinder {
  private connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * Find all pools for a program
   */
  async findPools(programId: PublicKey, limit: number = 10): Promise<Array<{
    pubkey: PublicKey;
    data: any;
  }>> {
    try {
      const accounts = await this.connection.getProgramAccounts(programId, {
        filters: [
          {
            dataSize: 400, // Approximate pool account size
          },
        ],
      });

      return accounts.slice(0, limit).map(account => ({
        pubkey: account.pubkey,
        data: account.account.data,
      }));
    } catch (error) {
      console.error('Error finding pools:', error);
      return [];
    }
  }

  /**
   * Find token accounts for owner
   */
  async findTokenAccounts(owner: PublicKey, mint?: PublicKey) {
    const filters: any[] = [];
    
    if (mint) {
      filters.push({
        mint: mint.toBase58(),
      });
    }

    const accounts = await this.connection.getParsedTokenAccountsByOwner(owner, {
      programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    });

    return accounts.value.map(account => ({
      pubkey: account.pubkey,
      mint: new PublicKey(account.account.data.parsed.info.mint),
      amount: account.account.data.parsed.info.tokenAmount.amount,
      decimals: account.account.data.parsed.info.tokenAmount.decimals,
    }));
  }
}

/**
 * Simple instruction builders for common operations
 */
export class InstructionBuilders {
  /**
   * Build a simple transfer instruction
   */
  static transfer(
    from: PublicKey,
    to: PublicKey,
    amount: number
  ): TransactionInstruction {
    const SystemProgram = anchor.web3.SystemProgram;
    return SystemProgram.transfer({
      fromPubkey: from,
      toPubkey: to,
      lamports: amount,
    });
  }

  /**
   * Build a create account instruction
   */
  static async createAccount(
    connection: Connection,
    payer: PublicKey,
    newAccount: Keypair,
    space: number,
    programId: PublicKey
  ): Promise<TransactionInstruction> {
    const lamports = await connection.getMinimumBalanceForRentExemption(space);
    
    return anchor.web3.SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: newAccount.publicKey,
      lamports,
      space,
      programId,
    });
  }
}

/**
 * Test data generators
 */
export class TestDataGenerator {
  /**
   * Generate random keypair
   */
  static keypair(): Keypair {
    return Keypair.generate();
  }

  /**
   * Generate random public key
   */
  static publicKey(): PublicKey {
    return Keypair.generate().publicKey;
  }

  /**
   * Generate test amount
   */
  static amount(min: number = 1000000, max: number = 1000000000): anchor.BN {
    const amount = Math.floor(Math.random() * (max - min + 1)) + min;
    return new anchor.BN(amount);
  }
}

export default {
  DirectProgramClient,
  PDADeriver,
  TransactionBuilder,
  AccountFinder,
  InstructionBuilders,
  TestDataGenerator,
};