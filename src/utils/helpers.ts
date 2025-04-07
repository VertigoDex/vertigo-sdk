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
import path from "node:path";
import os from "node:os";
import fs from "node:fs";

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
    newReservesA: new anchor.BN(hexQuote.newReservesA, 16).toString(), // 16 specifies hex base
    newReservesB: new anchor.BN(hexQuote.newReservesB, 16).toString(),
    amountA: new anchor.BN(hexQuote.amountA, 16).toString(),
    amountB: new anchor.BN(hexQuote.amountB, 16).toString(),
    feeA: new anchor.BN(hexQuote.feeA, 16).toString(),
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

/**
 * Helper function to generate and save a keypair
 * @param filePath - Path to save the keypair. Can be absolute or relative
 * @returns The generated keypair
 */
export function generateAndSaveKeypair(filePath: string): Keypair {
  // Expand ~ to home directory if present
  const expandedPath = filePath.replace(/^~/, process.env.HOME || "~");
  // Handle both relative and absolute paths
  const absolutePath = path.isAbsolute(expandedPath)
    ? expandedPath
    : path.resolve(process.cwd(), expandedPath);

  // Create directory if it doesn't exist
  const dir = path.dirname(absolutePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Generate new keypair
  const keypair = Keypair.generate();

  // Save to file
  fs.writeFileSync(
    absolutePath,
    JSON.stringify(Array.from(keypair.secretKey)),
    { mode: 0o600 }
  );

  console.log(`Keypair saved to: ${absolutePath}`);
  return keypair;
}

/**
 * Helper function to load or generate a keypair
 * @param filePath - Path to load the existing keypair from
 * @param newFilePath - Path to save a new keypair if filePath is undefined or doesn't exist. Can be absolute or relative
 * @returns The loaded or generated keypair
 */
export function loadOrGenerateKeypair(
  filePath?: string,
  newFilePath?: string
): Keypair {
  try {
    // If filePath is provided, try to load the keypair
    if (filePath) {
      // Expand ~ to home directory if present
      const expandedPath = filePath.replace(/^~/, process.env.HOME || "~");
      const absolutePath = path.resolve(expandedPath);

      if (fs.existsSync(absolutePath)) {
        const fileContent = fs.readFileSync(absolutePath, "utf-8");
        try {
          return Keypair.fromSecretKey(Buffer.from(JSON.parse(fileContent)));
        } catch (parseError) {
          throw new Error(
            `Invalid keypair file format at ${absolutePath}: ${parseError.message}`
          );
        }
      }
    }

    // If we get here, either filePath wasn't provided or the file didn't exist
    // Generate new keypair using newFilePath
    if (!newFilePath) {
      throw new Error(
        "Must provide either an existing keypair file path or a path to save a new keypair"
      );
    }

    return generateAndSaveKeypair(newFilePath);
  } catch (error) {
    if (
      error.message.includes("Invalid keypair") ||
      error.message.includes("Must provide")
    ) {
      throw error; // Re-throw validation errors
    }
    throw new Error(`Error handling keypair: ${error.message}`);
  }
}

export function loadLocalWallet() {
  const pathToWallet = `${os.homedir()}/.config/solana/id.json`;
  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(pathToWallet, "utf-8")))
  );
  const wallet = new anchor.Wallet(walletKeypair);
  return wallet;
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
      case "mainnet-beta":
        return "https://api.mainnet-beta.solana.com";
      case "devnet":
        return "https://api.devnet.solana.com";
      case "testnet":
        return "https://api.testnet.solana.com";
      case "localnet":
        return "http://127.0.0.1:8899";
      default:
        throw new Error(
          `Invalid network: ${network}. Must be a valid URL or one of: mainnet-beta, devnet, testnet, localnet`
        );
    }
  }
}

/**
 * Read and parse a JSON file
 * @param filePath - Path to the JSON file
 * @returns Parsed JSON content
 */
export function parseJsonOrThrow(filePath: string) {
  // Resolve the file path
  const resolvedPath = path.resolve(filePath);

  // Check if file exists
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`File not found at: ${resolvedPath}`);
  }

  try {
    // Read and parse the JSON file
    const fileContent = fs.readFileSync(resolvedPath, "utf-8");
    return JSON.parse(fileContent);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in file: ${error.message}`);
    }
    throw error;
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
