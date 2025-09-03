import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import {
  createAssociatedTokenAccountInstruction,
  createSyncNativeInstruction,
  getAssociatedTokenAddress,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { SystemProgram, Transaction } from "@solana/web3.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export function getFactoryPda(
  owner: PublicKey,
  mintA: PublicKey,
  nonce: number,
  programId: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("factory"),
      owner.toBuffer(),
      mintA.toBuffer(),
      Uint8Array.from([nonce]),
    ],
    programId,
  );
}

export function getPoolPda(
  owner: PublicKey,
  mintA: PublicKey,
  mintB: PublicKey,
  programId: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("pool"), owner.toBuffer(), mintA.toBuffer(), mintB.toBuffer()],
    programId,
  );
}

export function getVaultPda(
  pool: PublicKey,
  mint: PublicKey,
  programId: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [pool.toBuffer(), mint.toBuffer()],
    programId,
  );
}

export async function fundSol(
  provider: anchor.AnchorProvider,
  account: PublicKey,
  amount: number,
) {
  await provider.connection.requestAirdrop(account, amount);
}

export async function fundWsol(
  provider: anchor.AnchorProvider,
  account: PublicKey,
  amount: number,
): Promise<PublicKey> {
  await fundSol(provider, provider.wallet.publicKey, amount);
  return await wrapSol(
    provider,
    amount,
    account,
    (provider.wallet as anchor.Wallet).payer,
    null,
  );
}

export async function wrapSol(
  provider: anchor.AnchorProvider,
  amount: number,
  owner: PublicKey,
  payer: Keypair,
  wsolAta: PublicKey | null,
): Promise<PublicKey> {
  // Get or create ATA for wSOL
  wsolAta =
    wsolAta ||
    (await getAssociatedTokenAddress(
      NATIVE_MINT,
      owner,
      false,
      TOKEN_PROGRAM_ID,
    ));

  const instructions = [];

  // Check if ATA exists
  const account = await provider.connection.getAccountInfo(wsolAta);
  if (!account) {
    instructions.push(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        wsolAta,
        owner,
        NATIVE_MINT,
        TOKEN_PROGRAM_ID,
      ),
    );
  }

  // Add wrap instructions
  instructions.push(
    SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: wsolAta,
      lamports: amount,
    }),
    createSyncNativeInstruction(wsolAta, TOKEN_PROGRAM_ID),
  );

  // Send transaction
  const transaction = new Transaction().add(...instructions);
  await provider.sendAndConfirm(transaction, [payer]);

  return wsolAta;
}

// Helper function to get token balance
export async function getTokenBalance(
  provider: anchor.AnchorProvider,
  account: PublicKey,
): Promise<anchor.BN> {
  return new anchor.BN(
    (await provider.connection.getTokenAccountBalance(account)).value.amount,
  );
}

export async function getTxLogs(
  provider: anchor.AnchorProvider,
  txSignature: anchor.web3.TransactionSignature,
) {
  // Get logs for this transaction
  const txInfo = await provider.connection.getTransaction(txSignature, {
    commitment: "confirmed",
  });

  if (!txInfo) {
    console.log("Transaction not found or not confirmed yet.");
    return;
  }

  return txInfo.meta?.logMessages;
}

// Helper function to log transaction info
export const logTx = (txHash: string, description: string) => {
  console.log(`Transaction: ${description}`);
  console.log(`https://explorer.solana.com/tx/${txHash}?cluster=custom`);
  console.log("---");
};

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
    { mode: 0o600 },
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
  newFilePath?: string,
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
            `Invalid keypair file format at ${absolutePath}: ${parseError.message}`,
          );
        }
      }
    }

    // If we get here, either filePath wasn't provided or the file didn't exist
    // Generate new keypair using newFilePath
    if (!newFilePath) {
      throw new Error(
        "Must provide either an existing keypair file path or a path to save a new keypair",
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
    Buffer.from(JSON.parse(fs.readFileSync(pathToWallet, "utf-8"))),
  );
  const wallet = new anchor.Wallet(walletKeypair);
  return wallet;
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
