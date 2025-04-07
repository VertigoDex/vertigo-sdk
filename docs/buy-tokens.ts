import { VertigoSDK } from "@vertigo-amm/vertigo-sdk";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { NATIVE_MINT } from "@solana/spl-token";

import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import fs from "node:fs";
import os from "node:os";

async function main() {
  // wallet is loaded from local machine
  const pathToWallet = `${os.homedir()}/.config/solana/id.json`;
  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(pathToWallet, "utf-8")))
  );
  const wallet = new anchor.Wallet(walletKeypair);

  const connection = new Connection("http://127.0.0.1:8899", "confirmed");

  // initialize sdk
  const vertigo = new VertigoSDK(connection, wallet, "tx");

  // address of the pool owner
  const owner = new PublicKey("<owner-address>");
  
  // addresses of the mints in the pool
  const mintA = NATIVE_MINT;
  const mintB = new PublicKey("<mint-address>"); 
  
  // Load the Keypair of the user performing the buy transaction
  // The user's token accounts for mintA and mintB should already
  // be created and the Token Account for mintA should be funded
  // before performing the transaction
  const user = ...

  /** (Optional) fetch a buy quote  */
  const quote = await vertigo.quoteBuy({
    amount: new anchor.BN(LAMPORTS_PER_SOL).muln(1),
    limit: new anchor.BN(0),
    owner: owner,
    mintA,
    mintB,
  });

  // this logs the quoted tokens to receive and any fees
  console.log({
    amountB: quote.amountB.toString(),
    feeA: quote.feeA.toString(),
  });

  // (optional) check token balance before the transaction
  const beforeBalance = await connection.getTokenAccountBalance(
    new PublicKey("<user-taB-address>")
  );

  // execute the buy transaction
  const tx = await vertigo.buy({
    owner: owner,
    user: user,
    mintA,
    mintB,
    userTaA: new PublicKey("<user-taA-address>"),
    userTaB: new PublicKey("<user-taB-address>"),
    tokenProgramA: TOKEN_PROGRAM_ID,
    tokenProgramB: TOKEN_2022_PROGRAM_ID,
    amount: new anchor.BN(LAMPORTS_PER_SOL).muln(1),
    limit: new anchor.BN(0),
  });
  console.log(`Buy tx: ${tx}`);

  // (optional) check token balance after the transaction
  const afterBalance = await connection.getTokenAccountBalance(
    new PublicKey("<user-taB-address>")
  );

  console.log(
    `Tokens purchased: ${
      Number(afterBalance.value.amount) - Number(beforeBalance.value.amount)
    }`
  );
  
}

main();