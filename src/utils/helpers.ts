import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  Commitment,
} from "@solana/web3.js";
import { FACTORY_SEED, POOL_SEED } from "../types";
import {
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { SDKError, SDKErrorType } from "../types/error";
import * as anchor from "@coral-xyz/anchor";
import { SwapResponse } from "../types/generated/amm";

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
  const url =
    explorer === "solscan"
      ? `https://solscan.io/tx/${signature}${clusterParam}${
          cluster === "custom" ? "&customUrl=http%3A%2F%2F127.0.0.1%3A8899" : ""
        }`
      : `https://explorer.solana.com/tx/${signature}${clusterParam}`;

  return url;
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

export function parseQuote(hexQuote: Record<string, string>): SwapResponse {
  return {
    newReservesA: new anchor.BN(hexQuote.newReservesA, 16), // 16 specifies hex base
    newReservesB: new anchor.BN(hexQuote.newReservesB, 16),
    amountA: new anchor.BN(hexQuote.amountA, 16),
    amountB: new anchor.BN(hexQuote.amountB, 16),
    feeA: new anchor.BN(hexQuote.feeA, 16),
  };
}

export function getFactoryPda(
  owner: PublicKey,
  mintA: PublicKey,
  nonce: number,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(FACTORY_SEED),
      owner.toBuffer(),
      mintA.toBuffer(),
      Uint8Array.from([nonce]),
    ],
    programId
  );
}

export function getPoolPda(
  owner: PublicKey,
  mintA: PublicKey,
  mintB: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(POOL_SEED),
      owner.toBuffer(),
      mintA.toBuffer(),
      mintB.toBuffer(),
    ],
    programId
  );
}

// Get RPC URL based on network
export function getRpcUrl(network: string) {
  // Check if network is provided
  if (!network) {
    throw new Error("Network parameter is required");
  }

  // Check if network is a valid URL
  try {
    new URL(network);
    return network;
  } catch {
    // If not a URL, check against known networks
    switch (network) {
      case "mainnet":
        return "https://api.mainnet-beta.solana.com";
      case "devnet":
        return "https://api.devnet.solana.com";
      case "testnet":
        return "https://api.testnet.solana.com";
      case "localnet":
        return "http://127.0.0.1:8899";
      default:
        throw new Error(
          `Invalid network: ${network}. Must be a valid URL or one of: mainnet, devnet, testnet, localnet`
        );
    }
  }
}

interface FeeParams {
  normalizationPeriod: anchor.BN;
  decay: number;
  royaltiesBps: number;
  privilegedSwapper?: PublicKey;
  reference?: anchor.BN;
}

interface LaunchParams {
  shift: anchor.BN;
  initialTokenBReserves: anchor.BN;
  feeParams: FeeParams;
}

/**
 * Validates launch parameters for pools
 * @param params - Launch parameters to validate
 * @throws Error if any validation fails
 */
export function validateLaunchParams(params: LaunchParams): void {
  // Check required fields exist
  if (!params.shift || !params.initialTokenBReserves || !params.feeParams) {
    throw new Error(
      "Missing required params: shift, initialTokenBReserves, or feeParams"
    );
  }

  const { feeParams } = params;

  // Check all fee params exist
  if (
    !feeParams.normalizationPeriod ||
    feeParams.decay === undefined ||
    feeParams.royaltiesBps === undefined
  ) {
    throw new Error(
      "Missing required fee parameters: normalizationPeriod, decay, royaltiesBps"
    );
  }

  // Validate numeric values
  if (params.shift.lten(0)) {
    throw new Error("shift must be positive");
  }

  if (params.initialTokenBReserves.lten(0)) {
    throw new Error("initialTokenBReserves must be positive");
  }

  if (feeParams.normalizationPeriod.lten(0)) {
    throw new Error("normalizationPeriod must be positive");
  }

  if (feeParams.decay <= 0 || feeParams.decay > 1) {
    throw new Error("decay must be between 0 and 1");
  }

  if (feeParams.royaltiesBps < 0 || feeParams.royaltiesBps > 10000) {
    throw new Error("royaltiesBps must be between 0 and 10000");
  }
}
