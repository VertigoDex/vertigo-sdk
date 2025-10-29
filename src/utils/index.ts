// Re-export existing utilities
export * from "./helpers";
export * from "./config";

// Export new utilities
export * from "./transaction";
export * from "./token";
export * from "./wallet-adapter";

// Additional utility functions
import { PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";

/**
 * Sleep for specified milliseconds
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Retry an async function with exponential backoff
 */
export const retry = async <T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
  } = {},
): Promise<T> => {
  const maxRetries = options.maxRetries ?? 3;
  const initialDelay = options.initialDelay ?? 1000;
  const maxDelay = options.maxDelay ?? 30000;
  const backoffFactor = options.backoffFactor ?? 2;

  let lastError: Error | undefined;
  let delay = initialDelay;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (i < maxRetries - 1) {
        await sleep(Math.min(delay, maxDelay));
        delay *= backoffFactor;
      }
    }
  }

  throw lastError || new Error("Retry failed");
};

/**
 * Chunk an array into smaller arrays
 */
export const chunk = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];

  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }

  return chunks;
};

/**
 * Convert BN to number safely (throws if too large)
 */
export const bnToNumber = (bn: anchor.BN): number => {
  const max = Number.MAX_SAFE_INTEGER;

  if (bn.gt(new anchor.BN(max))) {
    throw new Error(
      `BN ${bn.toString()} is too large to convert to number safely`,
    );
  }

  return bn.toNumber();
};

/**
 * Validate Solana address
 */
export const isValidAddress = (address: string): boolean => {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
};

/**
 * Shorten address for display
 */
export const shortenAddress = (
  address: string | PublicKey,
  chars: number = 4,
): string => {
  const str = typeof address === "string" ? address : address.toBase58();
  return `${str.slice(0, chars)}...${str.slice(-chars)}`;
};

/**
 * Get explorer URL for transaction
 */
export const getExplorerUrl = (
  signature: string,
  network: "mainnet" | "devnet" | "testnet" = "mainnet",
  explorer: "solscan" | "solanaExplorer" | "solanaBeach" = "solscan",
): string => {
  const cluster = network === "mainnet" ? "" : `?cluster=${network}`;

  switch (explorer) {
    case "solscan":
      return `https://solscan.io/tx/${signature}${cluster}`;
    case "solanaExplorer":
      return `https://explorer.solana.com/tx/${signature}${cluster}`;
    case "solanaBeach":
      return `https://solanabeach.io/transaction/${signature}${cluster}`;
    default:
      return `https://solscan.io/tx/${signature}${cluster}`;
  }
};

/**
 * Get explorer URL for address
 */
export const getAddressExplorerUrl = (
  address: string | PublicKey,
  network: "mainnet" | "devnet" | "testnet" = "mainnet",
  explorer: "solscan" | "solanaExplorer" | "solanaBeach" = "solscan",
): string => {
  const addr = typeof address === "string" ? address : address.toBase58();
  const cluster = network === "mainnet" ? "" : `?cluster=${network}`;

  switch (explorer) {
    case "solscan":
      return `https://solscan.io/account/${addr}${cluster}`;
    case "solanaExplorer":
      return `https://explorer.solana.com/address/${addr}${cluster}`;
    case "solanaBeach":
      return `https://solanabeach.io/address/${addr}${cluster}`;
    default:
      return `https://solscan.io/account/${addr}${cluster}`;
  }
};

/**
 * Calculate percentage change
 */
export const calculatePercentageChange = (
  oldValue: number | anchor.BN,
  newValue: number | anchor.BN,
): number => {
  const old = typeof oldValue === "number" ? oldValue : oldValue.toNumber();
  const current = typeof newValue === "number" ? newValue : newValue.toNumber();

  if (old === 0) return current === 0 ? 0 : 100;

  return ((current - old) / Math.abs(old)) * 100;
};

/**
 * Format number with commas
 */
export const formatNumber = (
  num: number | string | anchor.BN,
  decimals: number = 2,
): string => {
  const value =
    typeof num === "number"
      ? num
      : typeof num === "string"
        ? parseFloat(num)
        : num.toNumber();

  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

/**
 * Format currency
 */
export const formatCurrency = (
  amount: number | string | anchor.BN,
  currency: string = "USD",
  locale: string = "en-US",
): string => {
  const value =
    typeof amount === "number"
      ? amount
      : typeof amount === "string"
        ? parseFloat(amount)
        : amount.toNumber();

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(value);
};
