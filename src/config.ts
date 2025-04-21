import { SDKConfig } from "./types/sdk";
import { getClusterFromEndpoint, getExplorerUrl } from "./utils/helpers";
import { Connection } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { defaultConfig } from "./utils/config";
export class VertigoConfig {
  public connection: Connection;
  public wallet: anchor.Wallet;
  public logLevel: "verbose" | "tx" | "none";
  public explorer: "solscan" | "solanaExplorer";
  public cluster: string;
  public provider: anchor.AnchorProvider;
  public ammProgramIdOverride?: string;
  public token2022ProgramIdOverride?: string;
  public splTokenProgramIdOverride?: string;
  public ammProgramPath: string;
  public token2022ProgramPath: string;
  public splTokenProgramPath: string;

  constructor(
    connection: Connection,
    wallet: anchor.Wallet,
    config: SDKConfig = defaultConfig
  ) {
    const sdkConfig = {
      ...defaultConfig,
      ...config,
    };

    this.connection = connection;
    this.wallet = wallet;
    this.logLevel = sdkConfig?.logLevel || defaultConfig.logLevel;
    this.explorer = sdkConfig?.explorer || defaultConfig.explorer;
    this.cluster = getClusterFromEndpoint(connection.rpcEndpoint);

    this.provider = this.createProvider();

    anchor.setProvider(this.provider);
  }

  private createProvider() {
    return new anchor.AnchorProvider(this.connection, this.wallet, {
      commitment: "confirmed",
    });
  }

  public logTx(signature: string, operation: string) {
    if (["tx", "verbose"].includes(this.logLevel)) {
      const explorerUrl = getExplorerUrl(
        signature,
        this.cluster,
        this.explorer
      );
      console.log(`🔗 ${operation} transaction: ${explorerUrl}`);
    }
  }

  public log(message: string) {
    if (this.logLevel === "verbose") {
      console.log(message);
    }
  }
}
