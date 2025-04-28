import { VertigoSDK } from "../../src/sdk";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import fs from "node:fs";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import * as anchor from "@coral-xyz/anchor";

// imports to load from local file
import { NATIVE_MINT } from "@solana/spl-token";
import { getRpcUrl } from "../../src";

const argv = yargs(hideBin(process.argv))
  .option("network", {
    type: "string",
    description: "Solana network to use",
    default: "localnet",
    choices: ["mainnet-beta", "devnet", "testnet", "localnet"],
  })
  .option("path-to-payer", {
    type: "string",
    description: "Path to payer's keypair file",
    default: `${process.env.HOME}/.config/solana/id.json`,
  })
  .option("path-to-owner", {
    type: "string",
    description: "Path to owner's keypair file",
    default: `${process.env.HOME}/.config/solana/id.json`,
  })
  .option("mint", {
    type: "string",
    description: "Mint address",
    default: NATIVE_MINT.toBase58(),
  })
  .option("path-to-factory-params", {
    type: "string",
    description: "Path to factory params JSON file",
    demandOption: true,
  })
  .parseSync();

// Connect to Solana
const connection = new Connection(getRpcUrl(argv.network), "confirmed");

// Load payer keypair from file
const payer = Keypair.fromSecretKey(
  Buffer.from(JSON.parse(fs.readFileSync(argv["path-to-payer"], "utf-8")))
);
const wallet = new anchor.Wallet(payer);

// Load owner keypair from file
const owner = Keypair.fromSecretKey(
  Buffer.from(JSON.parse(fs.readFileSync(argv["path-to-owner"], "utf-8")))
);

// Validate factory params path is provided
if (!argv["path-to-factory-params"]) {
  throw new Error(
    "Factory params path must be provided via --path-to-factory-params"
  );
}

// Check if factory params file exists and can be parsed
try {
  if (!fs.existsSync(argv["path-to-factory-params"])) {
    throw new Error("Factory params file does not exist");
  }
  JSON.parse(fs.readFileSync(argv["path-to-factory-params"], "utf-8"));
} catch (error) {
  throw new Error("Factory params file is not valid or does not exist");
}

// Load and validate factory params from file
const rawFactoryParams = JSON.parse(
  fs.readFileSync(argv["path-to-factory-params"], "utf-8")
);

// Validate required fields
if (!rawFactoryParams.shift || !rawFactoryParams.initialTokenReserves) {
  throw new Error("Missing required fields: shift and initialTokenReserves");
}

if (
  !rawFactoryParams.feeParams ||
  !rawFactoryParams.feeParams.normalizationPeriod ||
  !rawFactoryParams.feeParams.decay ||
  !rawFactoryParams.feeParams.royaltiesBps
) {
  throw new Error("Missing required fee parameters");
}

if (
  !rawFactoryParams.tokenParams ||
  typeof rawFactoryParams.tokenParams.decimals !== "number" ||
  typeof rawFactoryParams.tokenParams.mutable !== "boolean"
) {
  throw new Error("Missing or invalid token parameters");
}

// Convert numeric strings to BN where needed
const factoryParams = {
  shift: new anchor.BN(rawFactoryParams.shift),
  initialTokenReserves: new anchor.BN(rawFactoryParams.initialTokenReserves),
  feeParams: {
    normalizationPeriod: new anchor.BN(
      rawFactoryParams.feeParams.normalizationPeriod
    ),
    decay: rawFactoryParams.feeParams.decay,
    royaltiesBps: rawFactoryParams.feeParams.royaltiesBps,
  },
  tokenParams: rawFactoryParams.tokenParams,
  nonce: rawFactoryParams.nonce,
};

async function main() {
  const provider = new anchor.AnchorProvider(connection, wallet);
  const vertigo = new VertigoSDK(provider);
  console.log("Vertigo SPL Token Factory");

  const signature = await vertigo.Token2022Factory.initialize({
    payer: wallet.payer,
    owner,
    mintA: new PublicKey(argv.mint),
    params: factoryParams,
  });

  console.log(`Transaction signature: ${signature}`);
}

main();
