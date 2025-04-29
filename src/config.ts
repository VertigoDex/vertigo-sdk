import { SDKConfig } from "./types/sdk";
import { getClusterFromEndpoint, getExplorerUrl } from "./utils/helpers";
import * as anchor from "@coral-xyz/anchor";
import { defaultConfig } from "./utils/config";
import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import {
  isWalletAdapter,
  toAnchorProvider,
  AdapterWithTx,
} from "./utils/bridge";

export class VertigoConfig {
  public provider: anchor.AnchorProvider;
  public connection: Connection;

  public logLevel: "verbose" | "tx" | "none";
  public explorer: "solscan" | "solanaExplorer";
  public cluster: string;

  public ammProgramId: PublicKey;
  public splTokenFactoryProgramId: PublicKey;
  public token2022FactoryProgramId: PublicKey;

  constructor(
    provider: anchor.AnchorProvider | AdapterWithTx,
    config: SDKConfig = defaultConfig
  ) {
    const sdkConfig = {
      ...defaultConfig,
      ...config,
    };

    const _provider: AnchorProvider = isWalletAdapter(provider)
      ? toAnchorProvider(
          provider as AdapterWithTx,
          new Connection(provider.url ?? "https://api.mainnet-beta.solana.com"),
          {
            commitment: "confirmed",
          }
        )
      : provider;
    this.provider = _provider;
    this.connection = _provider.connection;

    this.logLevel = sdkConfig?.logLevel || defaultConfig.logLevel;
    this.explorer = sdkConfig?.explorer || defaultConfig.explorer;
    this.cluster = getClusterFromEndpoint(_provider.connection.rpcEndpoint);

    anchor.setProvider(this.provider);

    this.ammProgramId = new PublicKey(sdkConfig.ammProgramId);
    this.splTokenFactoryProgramId = new PublicKey(
      sdkConfig.splTokenFactoryProgramId
    );
    this.token2022FactoryProgramId = new PublicKey(
      sdkConfig.token2022FactoryProgramId
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
