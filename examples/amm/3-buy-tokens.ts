import { VertigoSDK } from "../../src/sdk";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { NATIVE_MINT } from "@solana/spl-token";

import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { loadLocalWallet } from "../utils";
import fs from "node:fs";

async function main() {
  const wallet = loadLocalWallet();
  const connection = new Connection("http://127.0.0.1:8899", "confirmed");

  const ownerPath = "./users/owner.json";
  const userPath = "./users/user.json";

  const owner = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(ownerPath, "utf-8")))
  );
  const user = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(userPath, "utf-8")))
  );

  const ADDRESSES = JSON.parse(fs.readFileSync("./addresses.json", "utf-8"));

  const vertigo = new VertigoSDK(connection, wallet, "tx");

  /** Try buying from pool */
  const quote = await vertigo.quoteBuy({
    amount: new anchor.BN(LAMPORTS_PER_SOL).muln(1),
    limit: new anchor.BN(0),
    owner: owner.publicKey,
    mintA: NATIVE_MINT,
    mintB: new PublicKey(ADDRESSES.MINT),
  });
  console.log({
    amountB: quote.amountB.toString(),
    feeA: quote.feeA.toString(),
  });

  let totalBought = 0;
  for (let i = 0; i < 5; i++) {
    const beforeBalance = await connection.getTokenAccountBalance(
      new PublicKey(ADDRESSES.USER_TAB_TOKEN_ACCOUNT)
    );

    await vertigo.buy({
      owner: owner.publicKey,
      user: user,
      mintA: NATIVE_MINT,
      mintB: new PublicKey(ADDRESSES.MINT),
      userTaA: new PublicKey(ADDRESSES.USER_TAA_ACCOUNT),
      userTaB: new PublicKey(ADDRESSES.USER_TAB_TOKEN_ACCOUNT),
      tokenProgramA: TOKEN_PROGRAM_ID,
      tokenProgramB: TOKEN_2022_PROGRAM_ID,
      amount: new anchor.BN(LAMPORTS_PER_SOL).muln(1),
      limit: new anchor.BN(0),
    });

    const afterBalance = await connection.getTokenAccountBalance(
      new PublicKey(ADDRESSES.USER_TAB_TOKEN_ACCOUNT)
    );
    totalBought +=
      Number(afterBalance.value.amount) - Number(beforeBalance.value.amount);
    console.log(
      `Tokens purchased: ${
        Number(afterBalance.value.amount) - Number(beforeBalance.value.amount)
      }`
    );
  }
}

main();
