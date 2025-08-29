// Main client exports
export { VertigoClient } from "./client/VertigoClient";
export { PoolClient } from "./client/PoolClient";
export { SwapClient } from "./client/SwapClient";
export { FactoryClient, type TokenMetadata, type LaunchTokenParams, type LaunchTokenWithPoolParams } from "./client/FactoryClient";
export { RelayClient, type RelayConfig, type RelayPermission } from "./client/RelayClient";

// Type exports
export * from "./types";
export * from "./types/client";

// Utility exports
export * from "./utils";

// Core exports
export * from "./core/constants";

// Legacy SDK for backwards compatibility
export { VertigoSDK } from "./sdk";

// Convenience function for quick setup
import { VertigoClient } from "./client/VertigoClient";
import { Connection } from "@solana/web3.js";
import { Network } from "./core/constants";

/**
 * Quick setup function for the Vertigo SDK
 * @param connection - Solana connection
 * @param wallet - Optional wallet for signing transactions
 * @param network - Network to use (mainnet, devnet, localnet)
 */
export const Vertigo = {
  load: VertigoClient.load,
  loadWithConfig: VertigoClient.loadWithConfig,
  loadReadOnly: VertigoClient.loadReadOnly,
};

// Version export
export const VERSION = "2.0.0";
