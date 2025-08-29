import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { VertigoConfig, WalletLike } from "../types/client";
import { 
  VERTIGO_PROGRAMS, 
  DEFAULT_COMMITMENT, 
  API_ENDPOINTS,
  Network,
  RPC_ENDPOINTS
} from "../core/constants";
import { PoolClient } from "./PoolClient";
import { SwapClient } from "./SwapClient";
import { FactoryClient } from "./FactoryClient";
import { RelayClient } from "./RelayClient";
import { VertigoAPI } from "../api/VertigoAPI";
import type { Amm } from "../../../target/types/amm";
import type { PoolAuthority } from "../../../target/types/pool_authority";
import type { SplTokenFactory } from "../../../target/types/spl_token_factory";
import type { Token2022Factory } from "../../../target/types/token_2022_factory";
import type { PermissionedRelay } from "../../../target/types/permissioned_relay";

export class VertigoClient {
  public readonly connection: Connection;
  public readonly wallet?: WalletLike;
  public readonly network: Network;
  public readonly provider: anchor.AnchorProvider;
  
  // Programs
  public readonly ammProgram: anchor.Program<Amm>;
  public readonly poolAuthorityProgram?: anchor.Program<PoolAuthority>;
  public readonly splTokenFactoryProgram?: anchor.Program<SplTokenFactory>;
  public readonly token2022FactoryProgram?: anchor.Program<Token2022Factory>;
  public readonly permissionedRelayProgram?: anchor.Program<PermissionedRelay>;
  
  // Client modules
  public readonly pools: PoolClient;
  public readonly swap: SwapClient;
  public readonly factory: FactoryClient;
  public readonly relay: RelayClient;
  public readonly api: VertigoAPI;
  
  // Configuration
  private readonly config: Required<VertigoConfig>;

  private constructor(config: Required<VertigoConfig>) {
    this.config = config;
    this.connection = config.connection;
    this.wallet = config.wallet;
    this.network = config.network;
    
    // Create provider
    const wallet = this.wallet || {
      publicKey: PublicKey.default,
      signTransaction: async () => { throw new Error("Wallet not connected"); },
      signAllTransactions: async () => { throw new Error("Wallet not connected"); },
    };
    
    this.provider = new anchor.AnchorProvider(
      this.connection,
      wallet as anchor.Wallet,
      {
        commitment: config.commitment,
        skipPreflight: config.skipPreflight,
      }
    );
    
    // Initialize programs
    this.ammProgram = this.initializeProgram<Amm>("amm", config.programs.amm);
    
    if (config.programs.poolAuthority) {
      this.poolAuthorityProgram = this.initializeProgram<PoolAuthority>(
        "pool_authority",
        config.programs.poolAuthority
      );
    }
    
    if (config.programs.splTokenFactory) {
      this.splTokenFactoryProgram = this.initializeProgram<SplTokenFactory>(
        "spl_token_factory",
        config.programs.splTokenFactory
      );
    }
    
    if (config.programs.token2022Factory) {
      this.token2022FactoryProgram = this.initializeProgram<Token2022Factory>(
        "token_2022_factory",
        config.programs.token2022Factory
      );
    }
    
    if (config.programs.permissionedRelay) {
      this.permissionedRelayProgram = this.initializeProgram<PermissionedRelay>(
        "permissioned_relay",
        config.programs.permissionedRelay
      );
    }
    
    // Initialize client modules
    this.pools = new PoolClient(this);
    this.swap = new SwapClient(this);
    this.factory = new FactoryClient(this);
    this.relay = new RelayClient(this);
    
    // Initialize API client
    this.api = new VertigoAPI(this.network, config.apiUrl);
    if (config.cache?.enabled && config.cache?.ttl) {
      this.api.setCacheTtl(config.cache.ttl);
    }
  }

  private initializeProgram<T>(idlName: string, programId?: PublicKey): anchor.Program<T> {
    const idl = require(`../../../target/idl/${idlName}.json`);
    return new anchor.Program(idl, programId, this.provider) as anchor.Program<T>;
  }

  /**
   * Load Vertigo client with automatic configuration
   */
  static async load(config: VertigoConfig): Promise<VertigoClient> {
    const network = config.network || "mainnet";
    const connection = config.connection || new Connection(
      RPC_ENDPOINTS[network],
      config.commitment || DEFAULT_COMMITMENT
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
        poolAuthority: config.programs?.poolAuthority || VERTIGO_PROGRAMS[network].POOL_AUTHORITY,
        splTokenFactory: config.programs?.splTokenFactory || VERTIGO_PROGRAMS[network].SPL_TOKEN_FACTORY,
        token2022Factory: config.programs?.token2022Factory || VERTIGO_PROGRAMS[network].TOKEN_2022_FACTORY,
        permissionedRelay: config.programs?.permissionedRelay || VERTIGO_PROGRAMS[network].PERMISSIONED_RELAY,
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
  static async loadWithConfig(config: Required<VertigoConfig>): Promise<VertigoClient> {
    return new VertigoClient(config);
  }

  /**
   * Create a read-only client (no wallet required)
   */
  static async loadReadOnly(
    connection: Connection,
    network: Network = "mainnet"
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
      splTokenFactory: this.splTokenFactoryProgram?.programId,
      token2022Factory: this.token2022FactoryProgram?.programId,
      permissionedRelay: this.permissionedRelayProgram?.programId,
    };
  }
}