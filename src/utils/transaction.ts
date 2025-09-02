import {
  Connection,
  Transaction,
  TransactionInstruction,
  ComputeBudgetProgram,
  PublicKey,
  Commitment,
  RpcResponseAndContext,
  SimulatedTransactionResponse,
} from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";

/**
 * Add priority fee instructions to a transaction
 */
export const addPriorityFee = (
  tx: Transaction,
  priorityFee: number,
  computeUnits?: number
): Transaction => {
  const instructions: TransactionInstruction[] = [];

  // Add compute unit price
  instructions.push(
    ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: priorityFee,
    })
  );

  // Add compute unit limit if specified
  if (computeUnits) {
    instructions.push(
      ComputeBudgetProgram.setComputeUnitLimit({
        units: computeUnits,
      })
    );
  }

  // Add instructions at the beginning of the transaction
  tx.instructions.unshift(...instructions);
  
  return tx;
};

/**
 * Estimate priority fee based on recent transactions
 */
export const estimatePriorityFee = async (
  connection: Connection,
  percentile: 50 | 75 | 90 | 95 = 75
): Promise<number> => {
  try {
    // Get recent prioritization fees
    const recentFees = await connection.getRecentPrioritizationFees();
    
    if (!recentFees || recentFees.length === 0) {
      return 1000; // Default to 1000 microlamports
    }

    // Sort fees and get percentile
    const fees = recentFees
      .map(f => f.prioritizationFee)
      .filter(f => f > 0)
      .sort((a, b) => a - b);

    if (fees.length === 0) {
      return 1000;
    }

    const index = Math.floor((fees.length * percentile) / 100);
    return fees[Math.min(index, fees.length - 1)];
  } catch (error) {
    console.error("Failed to estimate priority fee:", error);
    return 1000; // Default fallback
  }
};

/**
 * Simulate a transaction and return results
 */
export const simulateTransaction = async (
  connection: Connection,
  tx: Transaction,
  commitment: Commitment = "confirmed"
): Promise<{
  success: boolean;
  logs?: string[];
  unitsConsumed?: number;
  error?: string;
}> => {
  try {
    const simulation = await connection.simulateTransaction(tx, {
      commitment,
      replaceRecentBlockhash: true,
    });

    if (simulation.value.err) {
      return {
        success: false,
        logs: simulation.value.logs,
        error: JSON.stringify(simulation.value.err),
      };
    }

    return {
      success: true,
      logs: simulation.value.logs,
      unitsConsumed: simulation.value.unitsConsumed,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Simulation failed",
    };
  }
};

/**
 * Send transaction with retries
 */
export const sendTransactionWithRetry = async (
  connection: Connection,
  tx: Transaction,
  signers: anchor.web3.Signer[],
  options: {
    maxRetries?: number;
    retryDelay?: number;
    commitment?: Commitment;
    skipPreflight?: boolean;
  } = {}
): Promise<string> => {
  const maxRetries = options.maxRetries ?? 3;
  const retryDelay = options.retryDelay ?? 1000;
  const commitment = options.commitment ?? "confirmed";
  const skipPreflight = options.skipPreflight ?? false;

  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      // Get fresh blockhash for each retry
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash(commitment);
      tx.recentBlockhash = blockhash;
      tx.lastValidBlockHeight = lastValidBlockHeight;

      // Sign transaction
      if (signers.length > 0) {
        tx.sign(...signers);
      }

      // Send transaction
      const signature = await connection.sendRawTransaction(tx.serialize(), {
        skipPreflight,
        commitment,
      });

      // Confirm transaction
      const confirmation = await connection.confirmTransaction(
        {
          signature,
          blockhash,
          lastValidBlockHeight,
        },
        commitment
      );

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      return signature;
    } catch (error: any) {
      lastError = error;
      
      // Check if error is retryable
      const isRetryable = 
        error.message?.includes("blockhash not found") ||
        error.message?.includes("Blockhash expired") ||
        error.message?.includes("Transaction was not confirmed");

      if (!isRetryable || i === maxRetries - 1) {
        throw error;
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, retryDelay * (i + 1)));
    }
  }

  throw lastError || new Error("Transaction failed after retries");
};

/**
 * Build versioned transaction for better performance
 */
export const buildVersionedTransaction = async (
  connection: Connection,
  instructions: TransactionInstruction[],
  payer: PublicKey,
  lookupTables?: anchor.web3.AddressLookupTableAccount[]
): Promise<anchor.web3.VersionedTransaction> => {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

  const messageV0 = new anchor.web3.TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message(lookupTables);

  return new anchor.web3.VersionedTransaction(messageV0);
};

/**
 * Get transaction size in bytes
 */
export const getTransactionSize = (tx: Transaction): number => {
  const serialized = tx.serialize({ requireAllSignatures: false });
  return serialized.length;
};

/**
 * Check if transaction size is within limits
 */
export const isTransactionSizeValid = (tx: Transaction): boolean => {
  const size = getTransactionSize(tx);
  const MAX_TRANSACTION_SIZE = 1232; // Maximum transaction size in bytes
  return size <= MAX_TRANSACTION_SIZE;
};

/**
 * Split instructions into multiple transactions if needed
 */
export const splitInstructions = (
  instructions: TransactionInstruction[],
  maxInstructionsPerTx: number = 10
): TransactionInstruction[][] => {
  const batches: TransactionInstruction[][] = [];
  
  for (let i = 0; i < instructions.length; i += maxInstructionsPerTx) {
    batches.push(instructions.slice(i, i + maxInstructionsPerTx));
  }
  
  return batches;
};

/**
 * Wait for transaction confirmation with timeout
 */
export const waitForConfirmation = async (
  connection: Connection,
  signature: string,
  commitment: Commitment = "confirmed",
  timeoutMs: number = 30000
): Promise<boolean> => {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const status = await connection.getSignatureStatus(signature);
    
    if (status.value?.confirmationStatus === commitment) {
      return true;
    }
    
    if (status.value?.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  throw new Error(`Transaction confirmation timeout after ${timeoutMs}ms`);
};