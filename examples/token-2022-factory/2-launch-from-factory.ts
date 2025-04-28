import { VertigoSDK } from "../../src/sdk";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

// imports to load from local file
import fs from "node:fs";
import { NATIVE_MINT, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { DevBuyArgs, getRpcUrl } from "../../src";
import { LaunchRequest } from "../../src/types/generated/token_2022_factory";

const argv = yargs(hideBin(process.argv))
  .option("network", {
    type: "string",
    description: "Solana network to use",
    default: "localnet",
  })
  .option("path-to-payer", {
    type: "string",
    description: "Path to payer keypair file",
    default: `${process.env.HOME}/.config/solana/id.json`,
  })
  .option("path-to-owner", {
    type: "string",
    description: "Path to owner keypair file",
    default: `${process.env.HOME}/.config/solana/id.json`,
  })
  .option("launch-config", {
    type: "string",
    description: "Path to launch config file",
    demandOption: true,
  })
  .option("mint-a", {
    type: "string",
    description: "Path to mint A keypair file",
    default: NATIVE_MINT.toString(),
  })
  .option("path-to-mint-b", {
    type: "string",
    description: "Path to mint B keypair file",
    optional: true,
  })
  .option("path-to-mint-b-authority", {
    type: "string",
    description: "Path to mint B authority keypair file",
    optional: true,
  })
  .option("token-program-a", {
    type: "string",
    description: "Token program address",
    default: TOKEN_PROGRAM_ID.toString(),
  })
  .option("path-to-user", {
    type: "string",
    description: "Path to user keypair file",
    optional: true,
  })
  .option("privileged-swapper", {
    type: "string",
    description: "Address of the privileged swapper",
    optional: true,
  })
  .option("dev-buy-amount", {
    type: "number",
    description: "Amount of SOL to spend on dev buy",
    optional: true,
  })
  .option("dev-buy-limit", {
    type: "number",
    description: "Limit for the dev buy order",
    optional: true,
  })
  .parseSync();

// Connect to Solana
const connection = new Connection(getRpcUrl(argv.network), "confirmed");

// Load wallet from path
const wallet = new anchor.Wallet(
  Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(argv["path-to-payer"], "utf-8")))
  )
);

// Load owner from path
const owner = Keypair.fromSecretKey(
  Buffer.from(JSON.parse(fs.readFileSync(argv["path-to-owner"], "utf-8")))
);

// Validate launch config path is provided
if (!argv["launch-config"]) {
  throw new Error("Launch config path must be provided via --launch-config");
}

// check if launch config is a file
try {
  if (!fs.existsSync(argv["launch-config"])) {
    throw new Error("Launch config file does not exist");
  }
  JSON.parse(fs.readFileSync(argv["launch-config"], "utf-8"));
} catch (error) {
  throw new Error("Launch config file is not valid or does not exist");
}

// Load launch config
const launchConfig = JSON.parse(
  fs.readFileSync(argv["launch-config"], "utf-8")
);

// Validate privilegedSwapper if provided
if (
  launchConfig.privilegedSwapper !== null &&
  (typeof launchConfig.privilegedSwapper !== "string" ||
    !PublicKey.isOnCurve(new PublicKey(launchConfig.privilegedSwapper)))
) {
  throw new Error(
    "Launch config privilegedSwapper must be null or a valid public key string"
  );
}

// Create or load mint B and authority keypairs
const mintB = argv["path-to-mint-b"]
  ? Keypair.fromSecretKey(
      Buffer.from(JSON.parse(fs.readFileSync(argv["path-to-mint-b"], "utf-8")))
    )
  : Keypair.generate();

const mintBAuthority = argv["path-to-mint-b-authority"]
  ? Keypair.fromSecretKey(
      Buffer.from(
        JSON.parse(fs.readFileSync(argv["path-to-mint-b-authority"], "utf-8"))
      )
    )
  : owner;

const launchCfg = {
  tokenConfig: {
    name: launchConfig.tokenConfig.name,
    symbol: launchConfig.tokenConfig.symbol,
    uri: launchConfig.tokenConfig.uri,
  },
  privilegedSwapper: launchConfig.privilegedSwapper
    ? new PublicKey(launchConfig.privilegedSwapper)
    : null,
  reference: new anchor.BN(launchConfig.reference),
  nonce: launchConfig.nonce,
};

// Validate required fields in launch config
if (
  !launchConfig.tokenConfig ||
  !launchConfig.tokenConfig.name ||
  !launchConfig.tokenConfig.symbol ||
  !launchConfig.tokenConfig.uri
) {
  throw new Error(
    "Missing required launch config fields: name, symbol, or uri"
  );
}

async function main() {
  const provider = new anchor.AnchorProvider(connection, wallet);
  const vertigo = new VertigoSDK(provider);

  const args: LaunchRequest & Partial<DevBuyArgs> = {
    payer: wallet.payer,
    owner,
    mintA: new PublicKey(argv["mint-a"]), // defaults to NATIVE_MINT if not provided
    mintB,
    mintBAuthority,
    tokenProgramA: new PublicKey(argv["token-program-a"]), // defaults to SPL Token Program
    params: launchCfg,
  };

  const shouldDoDevBuy = !!(argv["dev-buy-amount"] && argv["dev-buy-limit"]);

  if (shouldDoDevBuy) {
    args.amount = new anchor.BN(argv["dev-buy-amount"]);
    args.limit = new anchor.BN(argv["dev-buy-limit"]);
    args.dev = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(fs.readFileSync(argv["path-to-user"], "utf-8")))
    );
  }
  const { signature, poolAddress } = await vertigo.Token2022Factory.launch(
    args
  );

  console.log(`Signature: ${signature}`);
  console.log(`Pool address: ${poolAddress}`);
  console.log("Mint address: ", mintB.publicKey.toBase58());
}

main();
