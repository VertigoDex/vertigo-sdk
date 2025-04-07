import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, NATIVE_MINT } from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import fs from "node:fs";
import { getRpcUrl, VertigoSDK } from "../../src";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const argv = yargs(hideBin(process.argv))
  .option("network", {
    type: "string",
    description: "Solana network to use",
    default: "localnet",
  })
  .option("path-to-claimer", {
    type: "string",
    description: "Path to claimer keypair file",
    default: `${process.env.HOME}/.config/solana/id.json`,
  })
  .option("pool-address", {
    type: "string",
    description: "Pool address",
    demandOption: true,
  })
  .option("receiver-mint-a-token-account", {
    type: "string",
    description: "Receiver mint A token account address",
    optional: true,
  })
  .option("mint-a", {
    type: "string",
    description: "Mint A address",
    default: NATIVE_MINT.toString(),
  })
  .option("token-program-a", {
    type: "string",
    description: "Token program A address",
    default: TOKEN_PROGRAM_ID.toString(),
  })
  .parseSync();

async function main() {
  const connection = new Connection(getRpcUrl(argv.network), "confirmed");

  const wallet = new anchor.Wallet(
    Keypair.fromSecretKey(
      Buffer.from(JSON.parse(fs.readFileSync(argv["path-to-claimer"], "utf-8")))
    )
  );

  const owner = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(argv["path-to-claimer"], "utf-8")))
  );

  const vertigo = new VertigoSDK(connection, wallet);

  let receiverTaA: PublicKey;

  if (argv["receiver-mint-a-token-account"]) {
    receiverTaA = new PublicKey(argv["receiver-mint-a-token-account"]);
  } else {
    receiverTaA = await getAssociatedTokenAddressSync(
      new PublicKey(argv["mint-a"]),
      owner.publicKey,
      false,
      new PublicKey(argv["token-program-a"])
    );
  }

  await vertigo.claimRoyalties({
    pool: new PublicKey(argv["pool-address"]),
    claimer: owner,
    mintA: new PublicKey(argv["mint-a"]),
    receiverTaA: receiverTaA,
    tokenProgramA: new PublicKey(argv["token-program-a"]),
  });
}

main();
