import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import {
  createAssociatedTokenAccount,
  createMint,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import {
  getRpcUrl,
  validateLaunchParams,
  getOrCreateAssociatedTokenAccount,
} from "../../src/utils/helpers";
import {
  loadLocalWallet,
  loadOrGenerateKeypair,
  parseJsonOrThrow,
} from "../utils";

const argv = yargs(hideBin(process.argv))
  .option("network", {
    type: "string",
    description: "Solana network to use",
    default: "localnet",
    choices: ["mainnet", "devnet", "testnet", "localnet"],
  })
  .option("path-to-owner", {
    type: "string",
    description: "Path to owner's keypair file",
    default: "~/.config/solana/id.json",
  })
  .option("path-to-user", {
    type: "string",
    description: "Path to user's keypair file",
    default: "~/.config/solana/id.json",
  })
  .option("path-to-token-wallet-authority", {
    type: "string",
    description:
      "Path to token wallet authority's keypair file. Defaults to generating a new keypair file.",
    optional: true,
  })
  .option("path-to-mint", {
    type: "string",
    description:
      "Path to mint's keypair file. Defaults to generating a new keypair file.",
    optional: true,
  })
  .option("path-to-mint-authority", {
    type: "string",
    description:
      "Path to mint authority's keypair file. Defaults to generating a new keypair file.",
    optional: true,
  })
  .option("token-program-b", {
    type: "string",
    description: "Token program B",
    default: TOKEN_PROGRAM_ID,
  })
  .option("decimals", {
    type: "number",
    description: "Number of decimal places for the token",
    default: 6,
  })
  .option("path-to-pool-params", {
    type: "string",
    description: "Path to pool params file",
    demandOption: true,
  })
  .parseSync();

async function main() {
  // Connect to Solana
  const connection = new Connection(getRpcUrl(argv.network), "confirmed");

  // Load or generate wallet
  const wallet = loadLocalWallet();

  // Load or generate user
  const user = loadLocalWallet();

  // Load or generate token wallet authority
  const tokenWalletAuthority = loadOrGenerateKeypair(
    argv["path-to-token-wallet-authority"],
    "./token-wallet-authority.json"
  );

  // Load or generate mint
  const mint = loadOrGenerateKeypair(argv["path-to-mint"], "./mint.json");

  // Load or generate mint authority
  const mintAuthority = loadOrGenerateKeypair(
    argv["path-to-mint-authority"],
    "./mint-authority.json"
  );

  // Transfer from local wallet to token wallet authority
  console.log("Funding token wallet authority from local wallet");
  await connection.sendTransaction(
    new anchor.web3.Transaction().add(
      anchor.web3.SystemProgram.transfer({
        fromPubkey: wallet.payer.publicKey,
        toPubkey: tokenWalletAuthority.publicKey,
        lamports: LAMPORTS_PER_SOL,
      })
    ),
    [wallet.payer]
  );

  // Create mint used for the custom token
  await createMint(
    connection,
    wallet.payer, // payer
    mintAuthority.publicKey, // mint authority
    null, // no decimals
    argv.decimals, // number of decimal places
    mint, // token wallet
    null, // no freeze authority
    argv["token-program-b"]
  );
  console.log("Mint address: ", mint.publicKey.toBase58());

  // Create token wallet for the mint
  const tokenWallet = await getOrCreateAssociatedTokenAccount(
    connection,
    wallet.payer,
    mint.publicKey,
    tokenWalletAuthority.publicKey,
    argv["token-program-b"]
  );

  console.log(`Token wallet address: ${tokenWallet}`);

  // Read and validate pool params
  const rawPoolParams = parseJsonOrThrow(argv["path-to-pool-params"]);

  // Convert raw values to proper types
  const poolParams = {
    shift: new anchor.BN(rawPoolParams.shift),
    initialTokenBReserves: new anchor.BN(rawPoolParams.initialTokenBReserves),
    feeParams: {
      normalizationPeriod: new anchor.BN(
        rawPoolParams.feeParams.normalizationPeriod
      ),
      decay: rawPoolParams.feeParams.decay,
      royaltiesBps: rawPoolParams.feeParams.royaltiesBps,
      privilegedSwapper: rawPoolParams.feeParams.privilegedSwapper
        ? new anchor.web3.PublicKey(rawPoolParams.feeParams.privilegedSwapper)
        : undefined,
      reference: rawPoolParams.feeParams.reference
        ? new anchor.BN(rawPoolParams.feeParams.reference)
        : undefined,
    },
  };

  // Validate the converted params
  validateLaunchParams(poolParams);

  // Mint tokens to the token wallet authority
  const tokensToMint =
    poolParams.initialTokenBReserves.toNumber() * 10 ** argv.decimals;

  await mintTo(
    connection,
    wallet.payer,
    mint.publicKey,
    tokenWallet,
    mintAuthority.publicKey,
    tokensToMint,
    [mintAuthority],
    null,
    argv["token-program-b"]
  );

  // Create the dev custom token account
  await createAssociatedTokenAccount(
    connection,
    wallet.payer,
    mint.publicKey,
    user.publicKey,
    null,
    argv["token-program-b"]
  );
}

main();
