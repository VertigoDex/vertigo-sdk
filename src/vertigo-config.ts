import { SDKConfig } from "./sdk";
import { getClusterFromEndpoint, getExplorerUrl } from "./utils/helpers";
import { Connection } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";

export class VertigoConfig {
  public connection: Connection;
  public wallet: anchor.Wallet;
  public logLevel: "verbose" | "tx" | "none";
  public explorer: "solscan" | "solanaExplorer";
  public cluster: string;
  public provider: anchor.AnchorProvider;
  constructor(
    connection: Connection,
    wallet: anchor.Wallet,
    config: SDKConfig = {}
  ) {
    this.connection = connection;
    this.wallet = wallet;
    this.logLevel = config.logLevel ?? "verbose";
    this.explorer = config.explorer ?? "solanaExplorer";
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
