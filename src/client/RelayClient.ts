import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Transaction } from "@solana/web3.js";
import { VertigoClient } from "./VertigoClient";
import { TransactionOptions } from "../types/client";

export type RelayConfig = {
  authority: PublicKey;
  feeReceiver: PublicKey;
  swapFeeBps: number;
  maxSwapAmount: anchor.BN;
};

export type RelayPermission = {
  user: PublicKey;
  canSwap: boolean;
  maxAmount: anchor.BN;
  expiresAt?: anchor.BN;
};

export class RelayClient {
  constructor(private client: VertigoClient) {}

  /**
   * Check if relay is available
   */
  isRelayAvailable(): boolean {
    return !!this.client.permissionedRelayProgram;
  }

  /**
   * Initialize a new relay (admin only)
   */
  async initializeRelay(
    params: RelayConfig,
    options?: TransactionOptions
  ): Promise<string> {
    if (!this.client.isWalletConnected()) {
      throw new Error("Wallet not connected");
    }

    if (!this.client.permissionedRelayProgram) {
      throw new Error("Permissioned relay program not initialized");
    }

    const payer = this.client.wallet!.publicKey;

    const tx = await this.client.permissionedRelayProgram.methods
      .initialize({
        authority: params.authority,
        feeReceiver: params.feeReceiver,
        swapFeeBps: params.swapFeeBps,
        maxSwapAmount: params.maxSwapAmount,
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
   * Register a user for relay access
   */
  async registerUser(
    params: {
      relayAddress: PublicKey;
      user: PublicKey;
      permission: RelayPermission;
    },
    options?: TransactionOptions
  ): Promise<string> {
    if (!this.client.isWalletConnected()) {
      throw new Error("Wallet not connected");
    }

    if (!this.client.permissionedRelayProgram) {
      throw new Error("Permissioned relay program not initialized");
    }

    const authority = this.client.wallet!.publicKey;

    const tx = await this.client.permissionedRelayProgram.methods
      .register({
        canSwap: params.permission.canSwap,
        maxAmount: params.permission.maxAmount,
        expiresAt: params.permission.expiresAt,
      })
      .accounts({
        relay: params.relayAddress,
        authority,
        user: params.user,
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
   * Execute a swap through the relay
   */
  async relaySwap(
    params: {
      relayAddress: PublicKey;
      poolAddress: PublicKey;
      inputMint: PublicKey;
      outputMint: PublicKey;
      amount: number | anchor.BN;
      minOutputAmount: number | anchor.BN;
    },
    options?: TransactionOptions
  ): Promise<{
    signature: string;
    outputAmount: anchor.BN;
  }> {
    if (!this.client.isWalletConnected()) {
      throw new Error("Wallet not connected");
    }

    if (!this.client.permissionedRelayProgram) {
      throw new Error("Permissioned relay program not initialized");
    }

    const user = this.client.wallet!.publicKey;
    const amount = typeof params.amount === "number"
      ? new anchor.BN(params.amount)
      : params.amount;
    const minOutputAmount = typeof params.minOutputAmount === "number"
      ? new anchor.BN(params.minOutputAmount)
      : params.minOutputAmount;

    // Get pool data
    const pool = await this.client.pools.getPool(params.poolAddress);
    if (!pool) {
      throw new Error("Pool not found");
    }

    const tx = await this.client.permissionedRelayProgram.methods
      .swap({
        amount,
        minOutputAmount,
      })
      .accounts({
        relay: params.relayAddress,
        user,
        pool: params.poolAddress,
        poolOwner: pool.owner,
        mintA: pool.mintA,
        mintB: pool.mintB,
        tokenProgramA: anchor.spl.token.TOKEN_PROGRAM_ID,
        tokenProgramB: anchor.spl.token.TOKEN_PROGRAM_ID,
      })
      .transaction();

    if (options?.priorityFee && options.priorityFee !== "auto") {
      tx.add(
        anchor.web3.ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: options.priorityFee,
        })
      );
    }

    const signature = await this.client.provider.sendAndConfirm(tx, [], {
      skipPreflight: options?.skipPreflight ?? this.client.getConfig().skipPreflight,
      commitment: options?.commitment ?? this.client.getConfig().commitment,
    });

    // Return estimated output (would be parsed from transaction logs in production)
    return {
      signature,
      outputAmount: minOutputAmount, // This would be the actual amount from logs
    };
  }

  /**
   * Get relay configuration
   */
  async getRelayConfig(relayAddress: PublicKey): Promise<RelayConfig | null> {
    if (!this.client.permissionedRelayProgram) {
      throw new Error("Permissioned relay program not initialized");
    }

    try {
      const relay = await this.client.permissionedRelayProgram.account.relay.fetch(relayAddress);
      return {
        authority: relay.authority,
        feeReceiver: relay.feeReceiver,
        swapFeeBps: relay.swapFeeBps,
        maxSwapAmount: relay.maxSwapAmount,
      };
    } catch (error) {
      console.error("Failed to fetch relay config:", error);
      return null;
    }
  }

  /**
   * Get user permissions for a relay
   */
  async getUserPermission(
    relayAddress: PublicKey,
    user: PublicKey
  ): Promise<RelayPermission | null> {
    if (!this.client.permissionedRelayProgram) {
      throw new Error("Permissioned relay program not initialized");
    }

    // Find permission PDA
    const [permissionPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("permission"),
        relayAddress.toBuffer(),
        user.toBuffer(),
      ],
      this.client.permissionedRelayProgram.programId
    );

    try {
      const permission = await this.client.permissionedRelayProgram.account.permission.fetch(permissionPda);
      return {
        user: permission.user,
        canSwap: permission.canSwap,
        maxAmount: permission.maxAmount,
        expiresAt: permission.expiresAt,
      };
    } catch (error) {
      console.error("Failed to fetch user permission:", error);
      return null;
    }
  }

  /**
   * Claim fees from relay (authority only)
   */
  async claimRelayFees(
    relayAddress: PublicKey,
    options?: TransactionOptions
  ): Promise<string> {
    if (!this.client.isWalletConnected()) {
      throw new Error("Wallet not connected");
    }

    if (!this.client.permissionedRelayProgram) {
      throw new Error("Permissioned relay program not initialized");
    }

    const authority = this.client.wallet!.publicKey;

    const tx = await this.client.permissionedRelayProgram.methods
      .claim()
      .accounts({
        relay: relayAddress,
        authority,
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
   * Get all relays
   */
  async getAllRelays(): Promise<Array<{
    address: PublicKey;
    config: RelayConfig;
  }>> {
    if (!this.client.permissionedRelayProgram) {
      throw new Error("Permissioned relay program not initialized");
    }

    const relays = await this.client.permissionedRelayProgram.account.relay.all();
    
    return relays.map((relay) => ({
      address: relay.publicKey,
      config: {
        authority: relay.account.authority,
        feeReceiver: relay.account.feeReceiver,
        swapFeeBps: relay.account.swapFeeBps,
        maxSwapAmount: relay.account.maxSwapAmount,
      },
    }));
  }
}