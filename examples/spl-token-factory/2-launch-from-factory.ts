import { VertigoSDK } from "../../src/sdk";
import { Connection, Keypair } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";

// imports to load from local file
import fs from "node:fs";
import { loadLocalWallet } from "../utils";
import { FactoryLaunchParams } from "../../src";
import { NATIVE_MINT, TOKEN_PROGRAM_ID } from "@solana/spl-token";

// Connect to Solana
const connection = new Connection("http://127.0.0.1:8899", "confirmed");

const wallet = loadLocalWallet();

const ownerPath = "./users/owner.json";
const owner = Keypair.fromSecretKey(
  Buffer.from(JSON.parse(fs.readFileSync(ownerPath, "utf-8")))
);

const vertigo = new VertigoSDK(connection, wallet);

const tokenParams = {
  name: "Test Token",
  symbol: "TEST",
  uri: "https://test.com/metadata.json",
  feeFreebuys: 1,
};

const mintB = Keypair.generate();
const mintBAuthority = Keypair.generate();
const launchCfg: FactoryLaunchParams = {
  tokenConfig: tokenParams,
  feeFreeBuys: 1,
  reference: new anchor.BN(0),
};

async function main() {
  const { signature, poolAddress } = await vertigo.SPLTokenFactory.launch({
    payer: wallet.payer,
    owner,
    mintA: NATIVE_MINT,
    mintB,
    mintBAuthority,
    tokenProgramA: TOKEN_PROGRAM_ID,
    launchCfg,
  });

  console.log(`Signature: ${signature}`);
  console.log(`Pool address: ${poolAddress}`);
  console.log("Mint address: ", mintB.publicKey.toBase58());

  // Write pool address to file
  const addressesPath = "./addresses.json";
  fs.writeFileSync(
    addressesPath,
    JSON.stringify({
      poolAddress: poolAddress.toBase58(),
      mintAddress: mintB.publicKey.toBase58(),
    })
  );
}

await main();
