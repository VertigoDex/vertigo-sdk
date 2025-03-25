import { VertigoSDK } from "@vertigo-amm/vertigo-sdk";
import {
  Connection,
  Keypair,
  PublicKey,
} from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { NATIVE_MINT } from "@solana/spl-token";

import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import fs from "fs";
import os from "os";

// decimals of the mint in the pool
const DECIMALS = 6

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

  // Load the Keypair of the user performing the sell transaction
  const user = ...

  // quantity of tokens to sell
  const SELL_QUANTITY = 100_000; // 100,000 tokens

  // convert to anchor BN, multiply by the mint decimals to get the correct amount
  const SELL_QUANTITY_BN = new anchor.BN(SELL_QUANTITY).mul(new anchor.BN(10 ** DECIMALS));

  // fetch a sell quote
  const quoteSell = await vertigo.quoteSell({
    amount: SELL_QUANTITY_BN,
    limit: new anchor.BN(0),
    owner: owner,
    mintA,
    mintB,
  });
  console.log({
    amountA: quoteSell.amountA.toString(),
    feeA: quoteSell.feeA.toString(),
  });

  // check token balance before the transaction
  const beforeBalance = await connection.getTokenAccountBalance(
    new PublicKey("<user-taB-address>")
  );

  // execute the sell transaction
  await vertigo.sell({
    owner: owner,
    mintA,
    mintB,
    user: user,
    userTaA: new PublicKey("<user-taA-address>"),
    userTaB: new PublicKey("<user-taB-address>"),
    tokenProgramA: TOKEN_PROGRAM_ID,
    tokenProgramB: TOKEN_2022_PROGRAM_ID,
    amount: SELL_QUANTITY_BN,
    limit: new anchor.BN(0),
  });

  // check token balance after the transaction
  const afterBalance = await connection.getTokenAccountBalance(
    new PublicKey("<user-taB-address>")
  );
  console.log(
    `Tokens sold: ${
      Number(beforeBalance.value.amount) - Number(afterBalance.value.amount)
    }`
  );
}

main();