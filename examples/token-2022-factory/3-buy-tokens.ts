import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import {
  createAssociatedTokenAccount,
  getAssociatedTokenAddressSync,
  NATIVE_MINT,
} from "@solana/spl-token";

import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { fundWsol } from "../../../tests/utils";
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
  const userPath = "./users/user.json";
  const user = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(userPath, "utf-8")))
  );

  const addressesPath = "./addresses.json";
  const ADDRESSES = JSON.parse(fs.readFileSync(addressesPath, "utf-8"));

  const vertigo = new VertigoSDK(connection, wallet);

  /** Create user token accounts */
  let devSolTokenAccount = await getAssociatedTokenAddressSync(
    NATIVE_MINT,
    user.publicKey,
    false,
    TOKEN_PROGRAM_ID
  );
  if (!devSolTokenAccount) {
    try {
      devSolTokenAccount = await createAssociatedTokenAccount(
        connection,
        wallet.payer,
        NATIVE_MINT,
        user.publicKey,
        null,
        TOKEN_PROGRAM_ID
      );
    } catch {}
  }
  console.log(
    `Dev SOL token account created: ${devSolTokenAccount.toString()}`
  );
  // fund the dev SOL token account
  const provider = new anchor.AnchorProvider(connection, wallet);
  await fundWsol(provider, user.publicKey, LAMPORTS_PER_SOL * 10);

  // Create the dev custom token account
  const devTokenBTokenAccount = await createAssociatedTokenAccount(
    connection,
    wallet.payer,
    new PublicKey(ADDRESSES.mintAddress),
    user.publicKey,
    null,
    TOKEN_2022_PROGRAM_ID
  );
  console.log("User SOL token account: ", devSolTokenAccount.toString());
  console.log("User custom token account: ", devTokenBTokenAccount.toString());

  for (let i = 0; i < 10; i++) {
    console.log(`\n--Buy: ${i}--\n`);

    const signature = await vertigo.buy({
      owner: owner.publicKey,
      user,
      mintA: NATIVE_MINT,
      mintB: new PublicKey(ADDRESSES.mintAddress),
      userTaA: devSolTokenAccount,
      userTaB: devTokenBTokenAccount,
      tokenProgramA: TOKEN_PROGRAM_ID,
      tokenProgramB: TOKEN_2022_PROGRAM_ID,
      amount: new anchor.BN(LAMPORTS_PER_SOL).muln(1),
      limit: new anchor.BN(0),
    });
  }

  const userAddresses = {
    TaA: devSolTokenAccount,
    TaB: devTokenBTokenAccount,
  };

  // Write user addresses to file
  fs.writeFileSync(
    "./user-addresses.json",
    JSON.stringify(
      {
        userTaA: userAddresses.TaA.toString(),
        userTaB: userAddresses.TaB.toString(),
      },
      null,
      2
    )
  );
  console.log("User addresses written to ./user-addresses.json");
}

await main();
