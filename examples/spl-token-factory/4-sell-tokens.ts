import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { NATIVE_MINT, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { loadLocalWallet } from "../utils";
import fs from "node:fs";
import { VertigoSDK } from "../../src";
import { DECIMALS } from "../consts";

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
  const userPath = "./users/user.json";
  const user = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(userPath, "utf-8")))
  );

  const addressesPath = "./addresses.json";
  const ADDRESSES = JSON.parse(fs.readFileSync(addressesPath, "utf-8"));
  const USER_ADDRESSES = JSON.parse(
    fs.readFileSync("./user-addresses.json", "utf-8")
  );

  const vertigo = new VertigoSDK(connection, wallet);

  const signature = await vertigo.sell({
    owner: owner.publicKey,
    user,
    mintA: NATIVE_MINT,
    mintB: new PublicKey(ADDRESSES.mintAddress),
    userTaA: new PublicKey(USER_ADDRESSES.userTaA),
    userTaB: new PublicKey(USER_ADDRESSES.userTaB),
    tokenProgramA: TOKEN_PROGRAM_ID,
    tokenProgramB: TOKEN_PROGRAM_ID,
    amount: new anchor.BN(100_000).muln(10 ** DECIMALS),
    limit: new anchor.BN(0),
  });
}

await main();
