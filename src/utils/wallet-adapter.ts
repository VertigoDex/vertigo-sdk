import {
  PublicKey,
  Transaction,
  VersionedTransaction,
  Keypair,
} from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { WalletLike } from "../types/client";

/**
 * Adapter to convert WalletLike to anchor.Wallet
 */
export class WalletAdapter implements anchor.Wallet {
  public readonly publicKey: PublicKey;
  public readonly payer: Keypair;

  private _signTransaction: <T extends Transaction | VersionedTransaction>(
    tx: T,
  ) => Promise<T>;
  private _signAllTransactions: <T extends Transaction | VersionedTransaction>(
    txs: T[],
  ) => Promise<T[]>;

  constructor(wallet: WalletLike) {
    if ("payer" in wallet) {
      // It's already an anchor.Wallet
      const anchorWallet = wallet as anchor.Wallet;
      this.publicKey = anchorWallet.publicKey;
      this.payer = anchorWallet.payer;
      this._signTransaction = anchorWallet.signTransaction.bind(anchorWallet);
      this._signAllTransactions =
        anchorWallet.signAllTransactions.bind(anchorWallet);
    } else {
      // It's a WalletLike
      this.publicKey = wallet.publicKey;
      // Create a dummy payer for compatibility (won't be used if wallet signs)
      this.payer = Keypair.generate();

      this._signTransaction =
        wallet.signTransaction ||
        (async (tx) => {
          throw new Error("Wallet does not support signing");
        });

      this._signAllTransactions =
        wallet.signAllTransactions ||
        (async (txs) => {
          throw new Error("Wallet does not support signing");
        });
    }
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(
    tx: T,
  ): Promise<T> {
    return this._signTransaction(tx);
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(
    txs: T[],
  ): Promise<T[]> {
    return this._signAllTransactions(txs);
  }
}

/**
 * Create a default disconnected wallet
 */
export function createDisconnectedWallet(): anchor.Wallet {
  return new WalletAdapter({
    publicKey: PublicKey.default,
    signTransaction: async (tx) => {
      throw new Error("Wallet not connected");
    },
    signAllTransactions: async (txs) => {
      throw new Error("Wallet not connected");
    },
  });
}
