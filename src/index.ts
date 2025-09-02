// Main client exports - Default Vertigo SDK
export { VertigoClient } from "./client/VertigoClient";
export { PoolClient } from "./client/PoolClient";
export { SwapClient } from "./client/SwapClient";
export { RelayClient, type RelayConfig, type RelayPermission } from "./client/RelayClient";

// Separate Pool Authority client for advanced users
export { PoolAuthorityClient, type PoolAuthorityConfig } from "./client/PoolAuthorityClient";

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
import { PoolAuthorityClient } from "./client/PoolAuthorityClient";
import { Connection } from "@solana/web3.js";
import { Network } from "./core/constants";

/**
 * Main Vertigo SDK for AMM operations
 */
export const Vertigo = {
  load: VertigoClient.load,
  loadWithConfig: VertigoClient.loadWithConfig,
  loadReadOnly: VertigoClient.loadReadOnly,
};

/**
 * Pool Authority client for advanced pool management
 * Import separately to avoid confusion for normal users
 * 
 * @example
 * import { PoolAuthority } from '@vertigo/sdk';
 * const poolAuth = await PoolAuthority.load({ connection, wallet });
 */
export const PoolAuthority = {
  load: PoolAuthorityClient.load,
};

// Version export
export const VERSION = "2.0.0";
