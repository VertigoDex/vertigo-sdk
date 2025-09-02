import { PublicKey } from "@solana/web3.js";

export const VERTIGO_PROGRAMS = {
  mainnet: {
    AMM: new PublicKey("vrTGoBuy5rYSxAfV3jaRJWHH6nN9WK4NRExGxsk1bCJ"),
    POOL_AUTHORITY: new PublicKey("Vert8xR82wYZrftk7PLcYJNxSdhLCCAMy7zbCNNSS4d"),
    PERMISSIONED_RELAY: new PublicKey("FREEXMQuGxqrmT8gKJt82zfJjZACBiR8MNuQCbGSHyzF"),
  },
  devnet: {
    AMM: new PublicKey("vrTGoBuy5rYSxAfV3jaRJWHH6nN9WK4NRExGxsk1bCJ"),
    POOL_AUTHORITY: new PublicKey("Vert8xR82wYZrftk7PLcYJNxSdhLCCAMy7zbCNNSS4d"),
    PERMISSIONED_RELAY: new PublicKey("FREEXMQuGxqrmT8gKJt82zfJjZACBiR8MNuQCbGSHyzF"),
  },
  localnet: {
    AMM: new PublicKey("vrTGoBuy5rYSxAfV3jaRJWHH6nN9WK4NRExGxsk1bCJ"),
    POOL_AUTHORITY: new PublicKey("Vert8xR82wYZrftk7PLcYJNxSdhLCCAMy7zbCNNSS4d"),
    PERMISSIONED_RELAY: new PublicKey("FREEXMQuGxqrmT8gKJt82zfJjZACBiR8MNuQCbGSHyzF"),
  },
};

export const DEFAULT_COMMITMENT = "confirmed" as const;
export const DEFAULT_SKIP_PREFLIGHT = false;

export const API_ENDPOINTS = {
  mainnet: "https://api.vertigo.so",
  devnet: "https://api-devnet.vertigo.so",
  localnet: "http://localhost:3000",
};

export const RPC_ENDPOINTS = {
  mainnet: "https://api.mainnet-beta.solana.com",
  devnet: "https://api.devnet.solana.com",
  localnet: "http://localhost:8899",
};

export type Network = "mainnet" | "devnet" | "localnet";

export const VERTIGO_API_VERSION = "v1";

export const DEFAULT_SLIPPAGE_BPS = 50; // 0.5%
export const MAX_SLIPPAGE_BPS = 5000; // 50%

export const PRIORITY_FEES = {
  NONE: 0,
  LOW: 1_000,
  MEDIUM: 10_000,
  HIGH: 50_000,
  VERY_HIGH: 100_000,
  TURBO: 500_000,
} as const;