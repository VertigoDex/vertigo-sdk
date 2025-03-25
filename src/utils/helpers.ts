import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  Commitment,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { SDKError, SDKErrorType } from "../types/error";

/**
 * Get or create an associated token account
 */
export async function getOrCreateAssociatedTokenAccount(
  connection: Connection,
  payer: Keypair,
  mint: PublicKey,
  owner: PublicKey,
  tokenProgramId: PublicKey = TOKEN_PROGRAM_ID
): Promise<PublicKey> {
  try {
    const associatedToken = getAssociatedTokenAddressSync(
      mint,
      owner,
      false,
      tokenProgramId
    );

    // Check if account exists
    const account = await connection.getAccountInfo(associatedToken);

    if (!account) {
      const transaction = new Transaction().add(
        createAssociatedTokenAccountInstruction(
          payer.publicKey,
          associatedToken,
          owner,
          mint,
          tokenProgramId
        )
      );

      const signature = await connection.sendTransaction(transaction, [payer]);
      await connection.confirmTransaction(signature, "confirmed");
    }

    return associatedToken;
  } catch (error) {
    throw new SDKError(
      "Failed to get or create associated token account",
      SDKErrorType.TransactionError,
      error
    );
  }
}

/**
 * Format lamports to SOL string with specified decimal places
 */
export function formatSol(lamports: number, decimals = 4): string {
  return (lamports / LAMPORTS_PER_SOL).toFixed(decimals);
}

/**
 * Get cluster from RPC URL
 */
export function getClusterFromEndpoint(endpoint: string): string {
  if (endpoint.includes("devnet")) return "devnet";
  if (endpoint.includes("127.0.0.1") || endpoint.includes("localhost"))
    return "custom";
  return "mainnet";
}

/**
 * Get explorer URL for a transaction
 */
export function getExplorerUrl(
  signature: string,
  cluster: string,
  explorer: "solscan" | "solanaExplorer" = "solanaExplorer"
): string {
  const clusterParam = cluster === "mainnet" ? "" : `?cluster=${cluster}`;
  return explorer === "solscan"
    ? `https://solscan.io/tx/${signature}${clusterParam}`
    : `https://explorer.solana.com/tx/${signature}${clusterParam}`;
}

/**
 * Wait for a transaction to be confirmed and handle errors
 */
export async function confirmTransaction(
  connection: Connection,
  signature: string,
  commitment: Commitment = "confirmed"
): Promise<void> {
  try {
    const confirmation = await connection.confirmTransaction({
      signature,
      ...(commitment && { commitment }),
    });
    if (confirmation.value.err) {
      throw new SDKError(
        `Transaction failed: ${confirmation.value.err}`,
        SDKErrorType.TransactionError
      );
    }
  } catch (error) {
    throw new SDKError(
      "Failed to confirm transaction",
      SDKErrorType.NetworkError,
      error
    );
  }
}
