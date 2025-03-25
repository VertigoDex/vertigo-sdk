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
import { POOL_PARAMS } from "../consts";

async function main() {
  const wallet = loadLocalWallet();
  const connection = new Connection("http://127.0.0.1:8899", "confirmed");

  const vertigo = new VertigoSDK(connection, wallet, {
    logLevel: "tx",
    explorer: "solanaExplorer",
  });

  const ownerPath = "./users/owner.json";
  const userPath = "./users/user.json";
  const tokenWalletAuthorityPath = "./users/token-wallet-authority.json";

  const owner = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(ownerPath, "utf-8")))
  );
  const user = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(userPath, "utf-8")))
  );
  const tokenWalletAuthority = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(tokenWalletAuthorityPath, "utf-8")))
  );

  const ADDRESSES = JSON.parse(fs.readFileSync("./addresses.json", "utf-8"));

  const { signature, poolAddress } = await vertigo.launchPool({
    poolParams: POOL_PARAMS,
    payer: wallet.payer, // wallet is the payer
    owner, // wallet is also the owner in this example
    tokenWalletAuthority, // token wallet authority
    tokenWalletB: new PublicKey(ADDRESSES.TOKEN_WALLET), // token wallet
    mintA: new PublicKey(NATIVE_MINT), // wSOL mint
    mintB: new PublicKey(ADDRESSES.MINT), // custom token mint
    tokenProgramA: TOKEN_PROGRAM_ID, // this example uses the TOKEN_PROGRAM for the wSOL
    tokenProgramB: TOKEN_2022_PROGRAM_ID, // this example uses the TOKEN_2022 program for the custom token
    devBuyAmount: new anchor.BN(LAMPORTS_PER_SOL).muln(1), // 1 virtual SOL
    dev: user, // user that will be used to buy and sell the custom token
    devTaA: new PublicKey(ADDRESSES.USER_TAA_ACCOUNT), // dev SOL token account
    devTaB: new PublicKey(ADDRESSES.USER_TAB_TOKEN_ACCOUNT), // dev custom token account
  });
  console.log(`Transaction signature: ${signature}`);
  console.log(`Pool address: ${poolAddress}`);

  // Write pool address to file
  const POOL_ADDRESS = {
    POOL: poolAddress.toString(),
  };
  fs.writeFileSync(
    "./pool-address.json",
    JSON.stringify(POOL_ADDRESS, null, 2)
  );
  console.log("Pool address written to ./pool-address.json");
}

main();
