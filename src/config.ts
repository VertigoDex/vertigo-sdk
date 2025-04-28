import { SDKConfig } from "./types/sdk";
import { getClusterFromEndpoint, getExplorerUrl } from "./utils/helpers";
import * as anchor from "@coral-xyz/anchor";
import { defaultConfig } from "./utils/config";
import { Connection } from "@solana/web3.js";

export class VertigoConfig {
  public provider: anchor.AnchorProvider;
  public connection: Connection;

  public logLevel: "verbose" | "tx" | "none";
  public explorer: "solscan" | "solanaExplorer";
  public cluster: string;

  constructor(
    provider: anchor.AnchorProvider,
    config: SDKConfig = defaultConfig
  ) {
    const sdkConfig = {
      ...defaultConfig,
      ...config,
    };

    this.provider = provider;
    this.connection = provider.connection;

    this.logLevel = sdkConfig?.logLevel || defaultConfig.logLevel;
    this.explorer = sdkConfig?.explorer || defaultConfig.explorer;
    this.cluster = getClusterFromEndpoint(provider.connection.rpcEndpoint);

    this.provider = this.createProvider();

    anchor.setProvider(this.provider);
  }

  private createProvider() {
    return new anchor.AnchorProvider(
      this.provider.connection,
      this.provider.wallet,
      {
        commitment: "confirmed",
      }
    );
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
