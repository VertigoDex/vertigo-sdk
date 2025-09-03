import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { VertigoConfig, WalletLike } from "../types/client";
import {
  VERTIGO_PROGRAMS,
  DEFAULT_COMMITMENT,
  API_ENDPOINTS,
  Network,
  RPC_ENDPOINTS,
} from "../core/constants";
import { PoolClient } from "./PoolClient";
import { SwapClient } from "./SwapClient";
import { RelayClient } from "./RelayClient";
import { VertigoAPI } from "../api/VertigoAPI";
import {
  WalletAdapter,
  createDisconnectedWallet,
} from "../utils/wallet-adapter";
import type { Amm } from "../../target/types/amm";
import type { PoolAuthority } from "../../target/types/pool_authority";
import type { PermissionedRelay } from "../../target/types/permissioned_relay";

export class VertigoClient {
  public readonly connection: Connection;
  public readonly wallet?: WalletLike;
  public readonly network: Network;
  public readonly provider: anchor.AnchorProvider;

  // Programs
  public readonly ammProgram: anchor.Program<Amm>;
  public readonly poolAuthorityProgram?: anchor.Program<PoolAuthority>;
  public readonly permissionedRelayProgram?: anchor.Program<PermissionedRelay>;

  // Client modules
  public readonly pools: PoolClient;
  public readonly swap: SwapClient;
  public readonly relay: RelayClient;
  public readonly api: VertigoAPI;

  // Configuration
  private readonly config: Required<VertigoConfig>;
  private originalAccounts?: Map<string, unknown[]>;

  private constructor(config: Required<VertigoConfig>) {
    this.config = config;
    this.connection = config.connection;
    this.wallet = config.wallet;
    this.network = config.network;

    // Create provider with wallet adapter
    const wallet = this.wallet
      ? new WalletAdapter(this.wallet)
      : createDisconnectedWallet();

    this.provider = new anchor.AnchorProvider(this.connection, wallet, {
      commitment: config.commitment,
      skipPreflight: config.skipPreflight,
    });

    // Initialize programs
    const ammProgram = this.initializeProgram<Amm>("amm", config.programs.amm);
    if (!ammProgram) {
      throw new Error(
        "Failed to initialize AMM program - required for SDK operation",
      );
    }
    this.ammProgram = ammProgram;

    if (config.programs.poolAuthority) {
      this.poolAuthorityProgram = this.initializeProgram<PoolAuthority>(
        "pool_authority",
        config.programs.poolAuthority,
      );
    }

    if (config.programs.permissionedRelay) {
      this.permissionedRelayProgram = this.initializeProgram<PermissionedRelay>(
        "permissioned_relay",
        config.programs.permissionedRelay,
      );
    }

    // Initialize client modules
    this.pools = new PoolClient(this);
    this.swap = new SwapClient(this);
    this.relay = new RelayClient(this);

    // Initialize API client
    this.api = new VertigoAPI(this.network, config.apiUrl);
    if (config.cache?.enabled && config.cache?.ttl) {
      this.api.setCacheTtl(config.cache.ttl);
    }
  }

  private initializeProgram<T extends anchor.Idl>(
    idlName: string,
    programId?: PublicKey,
  ): anchor.Program<T> | undefined {
    try {
      const idl = require(`../../target/idl/${idlName}.json`);
      // Use program ID from parameter, or from IDL metadata, or throw error
      const finalProgramId =
        programId ||
        (idl.metadata?.address
          ? new PublicKey(idl.metadata.address)
          : undefined);
      if (!finalProgramId) {
        console.warn(
          `No program ID found for ${idlName}, skipping initialization`,
        );
        return undefined;
      }

      // Check if IDL has valid account definitions - but allow empty for workaround
      // if (!idl.accounts || idl.accounts.length === 0) {
      //   console.warn(`${idlName} has no account definitions, skipping initialization`);
      //   return undefined;
      // }

      // Work around an Anchor issue with account size calculation
      // Create a copy of the IDL and remove accounts to prevent Anchor from creating account clients
      // We'll handle account encoding/decoding manually when needed
      const modifiedIdl = JSON.parse(JSON.stringify(idl));

      // Store original accounts for later use if needed
      // Use a Map to store original accounts instead of dynamic property
      if (!this.originalAccounts) {
        this.originalAccounts = new Map();
      }
      this.originalAccounts.set(idlName, idl.accounts);

      // Remove accounts from IDL to prevent Anchor errors
      modifiedIdl.accounts = [];

      // Set the program ID in the IDL metadata if we have a finalProgramId
      if (finalProgramId) {
        if (!modifiedIdl.metadata) {
          modifiedIdl.metadata = {};
        }
        modifiedIdl.metadata.address = finalProgramId.toBase58();
      }

      console.log(
        `Initializing ${idlName} (removed ${idl.accounts?.length || 0} accounts to work around Anchor issue)`,
      );

      return new anchor.Program(modifiedIdl, this.provider);
    } catch (error) {
      console.warn(`Failed to initialize ${idlName}:`, error);
      return undefined;
    }
  }

  /**
   * Load Vertigo client with automatic configuration
   */
  static async load(config: VertigoConfig): Promise<VertigoClient> {
    const network = config.network || "mainnet";
    const connection =
      config.connection ||
      new Connection(
        RPC_ENDPOINTS[network],
        config.commitment || DEFAULT_COMMITMENT,
      );

    const fullConfig: Required<VertigoConfig> = {
      connection,
      wallet: config.wallet,
      network,
      commitment: config.commitment || DEFAULT_COMMITMENT,
      skipPreflight: config.skipPreflight ?? false,
      apiUrl: config.apiUrl || API_ENDPOINTS[network],
      programs: {
        amm: config.programs?.amm || VERTIGO_PROGRAMS[network].AMM,
        poolAuthority:
          config.programs?.poolAuthority ||
          VERTIGO_PROGRAMS[network].POOL_AUTHORITY,
        permissionedRelay:
          config.programs?.permissionedRelay ||
          VERTIGO_PROGRAMS[network].PERMISSIONED_RELAY,
      },
      cache: {
        enabled: config.cache?.enabled ?? true,
        ttl: config.cache?.ttl ?? 60000, // 1 minute default
      },
      priority: {
        autoFee: config.priority?.autoFee ?? true,
        baseFee: config.priority?.baseFee ?? 1000,
        maxFee: config.priority?.maxFee ?? 1000000,
      },
    };

    return new VertigoClient(fullConfig);
  }

  /**
   * Load with custom configuration
   */
  static async loadWithConfig(
    config: Required<VertigoConfig>,
  ): Promise<VertigoClient> {
    return new VertigoClient(config);
  }

  /**
   * Create a read-only client (no wallet required)
   */
  static async loadReadOnly(
    connection: Connection,
    network: Network = "mainnet",
  ): Promise<VertigoClient> {
    return VertigoClient.load({
      connection,
      network,
    });
  }

  /**
   * Get API URL for the current network
   */
  getApiUrl(): string {
    return this.config.apiUrl;
  }

  /**
   * Get configuration
   */
  getConfig(): Required<VertigoConfig> {
    return this.config;
  }

  /**
   * Check if wallet is connected
   */
  isWalletConnected(): boolean {
    return !!this.wallet;
  }

  /**
   * Get program addresses
   */
  getProgramAddresses() {
    return {
      amm: this.ammProgram.programId,
      poolAuthority: this.poolAuthorityProgram?.programId,
      permissionedRelay: this.permissionedRelayProgram?.programId,
    };
  }
}
