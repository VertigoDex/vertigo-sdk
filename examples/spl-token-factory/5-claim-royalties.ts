import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { NATIVE_MINT } from "@solana/spl-token";

import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { loadLocalWallet } from "../utils";
import fs from "node:fs";
import { VertigoSDK } from "../../src";

async function main() {
  /*
 1. Initialize the SDK 
 */

  // Connect to Solana
  const connection = new Connection("http://127.0.0.1:8899", "confirmed");
  const wallet = loadLocalWallet();

  const ownerPath = "./users/owner.json";
  const owner = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(ownerPath, "utf-8")))
  );

  const addressesPath = "./addresses.json";
  const ADDRESSES = JSON.parse(fs.readFileSync(addressesPath, "utf-8"));
  const USER_ADDRESSES = JSON.parse(
    fs.readFileSync("./user-addresses.json", "utf-8")
  );

  const vertigo = new VertigoSDK(connection, wallet);

  const signature = await vertigo.claimRoyalties({
    pool: new PublicKey(ADDRESSES.poolAddress),
    claimer: owner,
    mintA: NATIVE_MINT,
    receiverTaA: new PublicKey(USER_ADDRESSES.userTaA),
    tokenProgramA: TOKEN_PROGRAM_ID,
  });
}

await main();
