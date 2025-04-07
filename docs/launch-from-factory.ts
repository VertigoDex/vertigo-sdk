import { VertigoSDK } from "@vertigo-amm/vertigo-sdk";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";

// imports to load from local file
import fs from "fs";
import os from "os";

import {
  NATIVE_MINT,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

async function main() {
  // Connect to Solana
  const connection = new Connection("http://127.0.0.1:8899", "confirmed");

  // wallet is loaded from local machine
  const pathToWallet = `${os.homedir()}/.config/solana/id.json`;
  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(pathToWallet, "utf-8")))
  );
  const wallet = new anchor.Wallet(walletKeypair);

  const owner = ...

  // if performing a dev buy, load the dev keypair
  // you'll need to create the token accounts for the dev
  // and fund the Token Wallet with the dev SOL (or mintA if using another token)
  const dev = ...

  const vertigo = new VertigoSDK(connection, wallet);

  const tokenParams = {
    name: "Test Token",
    symbol: "TEST",
    uri: "https://test.com/metadata.json",
  };

  const mintB = Keypair.generate();
  const mintBAuthority = Keypair.generate();

  const launchCfg = {
    tokenConfig: tokenParams,
    feeFreeBuys: 1,
    reference: new anchor.BN(0),
  };

  const { signature, poolAddress } = await vertigo.launchFromFactory({
    payer: wallet.payer,
    owner,
    mintA: NATIVE_MINT,
    mintB,
    mintBAuthority,
    tokenProgramA: TOKEN_PROGRAM_ID,
    tokenProgramB: TOKEN_2022_PROGRAM_ID,
    launchCfg,
    devBuyAmount: new anchor.BN(LAMPORTS_PER_SOL),
    dev,
    devTaA: new PublicKey("<dev-token-account-a>"),
    devTaB: new PublicKey("<dev-token-account-b>"),
  });

  console.log(`Signature: ${signature}`);
  console.log(`Pool address: ${poolAddress}`);
  console.log("Mint address: ", mintB.publicKey.toBase58());
}

await main();
