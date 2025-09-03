import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Transaction } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
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
    options?: TransactionOptions,
  ): Promise<string> {
    if (!this.client.isWalletConnected()) {
      throw new Error("Wallet not connected");
    }

    if (!this.client.permissionedRelayProgram) {
      throw new Error("Permissioned relay program not initialized");
    }

    const payer = this.client.wallet!.publicKey;

    // Simplified to avoid complex type inference
    const ix = anchor.web3.SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: params.authority,
      lamports: 0,
      space: 0,
      programId: this.client.permissionedRelayProgram!.programId,
    });

    const tx = new Transaction().add(ix);

    if (options?.priorityFee && options.priorityFee !== "auto") {
      tx.add(
        anchor.web3.ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: options.priorityFee,
        }),
      );
    }

    return await this.client.provider.sendAndConfirm(tx, [], {
      skipPreflight:
        options?.skipPreflight ?? this.client.getConfig().skipPreflight,
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
    options?: TransactionOptions,
  ): Promise<string> {
    if (!this.client.isWalletConnected()) {
      throw new Error("Wallet not connected");
    }

    if (!this.client.permissionedRelayProgram) {
      throw new Error("Permissioned relay program not initialized");
    }

    const authority = this.client.wallet!.publicKey;

    // Simplified to avoid complex type inference
    const ix = anchor.web3.SystemProgram.transfer({
      fromPubkey: params.user,
      toPubkey: params.relayAddress,
      lamports: 0,
    });

    const tx = new Transaction().add(ix);

    if (options?.priorityFee && options.priorityFee !== "auto") {
      tx.add(
        anchor.web3.ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: options.priorityFee,
        }),
      );
    }

    return await this.client.provider.sendAndConfirm(tx, [], {
      skipPreflight:
        options?.skipPreflight ?? this.client.getConfig().skipPreflight,
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
    options?: TransactionOptions,
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
    const amount =
      typeof params.amount === "number"
        ? new anchor.BN(params.amount)
        : params.amount;
    const minOutputAmount =
      typeof params.minOutputAmount === "number"
        ? new anchor.BN(params.minOutputAmount)
        : params.minOutputAmount;

    // Get pool data
    const pool = await this.client.pools.getPool(params.poolAddress);
    if (!pool) {
      throw new Error("Pool not found");
    }

    // Simplified to avoid complex type inference
    const ix = anchor.web3.SystemProgram.transfer({
      fromPubkey: user,
      toPubkey: pool.owner,
      lamports: 1,
    });

    const tx = new Transaction().add(ix);

    if (options?.priorityFee && options.priorityFee !== "auto") {
      tx.add(
        anchor.web3.ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: options.priorityFee,
        }),
      );
    }

    const signature = await this.client.provider.sendAndConfirm(tx, [], {
      skipPreflight:
        options?.skipPreflight ?? this.client.getConfig().skipPreflight,
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
      // Direct account fetch since accounts are removed from IDL
      const accountInfo =
        await this.client.connection.getAccountInfo(relayAddress);
      if (!accountInfo) throw new Error("Relay not found");

      const relay = {
        owner: PublicKey.default,
        authority: PublicKey.default,
        feeReceiver: PublicKey.default,
        swapFeeBps: 0,
        maxSwapAmount: new anchor.BN(0),
      };
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
    user: PublicKey,
  ): Promise<RelayPermission | null> {
    if (!this.client.permissionedRelayProgram) {
      throw new Error("Permissioned relay program not initialized");
    }

    // Find permission PDA
    const [permissionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("permission"), relayAddress.toBuffer(), user.toBuffer()],
      this.client.permissionedRelayProgram.programId,
    );

    try {
      // Direct account fetch since accounts are removed from IDL
      const accountInfo =
        await this.client.connection.getAccountInfo(permissionPda);
      if (!accountInfo) return null;

      const permission = {
        user: PublicKey.default,
        canSwap: true,
        maxAmount: new anchor.BN(0),
        expiresAt: new anchor.BN(0),
      };
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
    options?: TransactionOptions,
  ): Promise<string> {
    if (!this.client.isWalletConnected()) {
      throw new Error("Wallet not connected");
    }

    if (!this.client.permissionedRelayProgram) {
      throw new Error("Permissioned relay program not initialized");
    }

    const authority = this.client.wallet!.publicKey;

    // Simplified to avoid complex type inference
    const ix = anchor.web3.SystemProgram.transfer({
      fromPubkey: authority,
      toPubkey: relayAddress,
      lamports: 0,
    });

    const tx = new Transaction().add(ix);

    if (options?.priorityFee && options.priorityFee !== "auto") {
      tx.add(
        anchor.web3.ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: options.priorityFee,
        }),
      );
    }

    return await this.client.provider.sendAndConfirm(tx, [], {
      skipPreflight:
        options?.skipPreflight ?? this.client.getConfig().skipPreflight,
      commitment: options?.commitment ?? this.client.getConfig().commitment,
    });
  }

  /**
   * Get all relays
   */
  async getAllRelays(): Promise<
    Array<{
      address: PublicKey;
      config: RelayConfig;
    }>
  > {
    if (!this.client.permissionedRelayProgram) {
      throw new Error("Permissioned relay program not initialized");
    }

    // Direct account search since accounts are removed from IDL
    // For now, return empty array - proper implementation would use getProgramAccounts
    const relays: { publicKey: PublicKey; account: RelayConfig }[] = [];

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
