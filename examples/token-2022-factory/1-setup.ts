import { VertigoSDK } from "../../src/sdk";
import { Connection, Keypair } from "@solana/web3.js";
import fs from "node:fs";

// imports to load from local file
import { NATIVE_MINT } from "@solana/spl-token";
import { loadLocalWallet } from "../utils";
import { FACTORY_PARAMS } from "../consts";

// Connect to Solana
const connection = new Connection("http://127.0.0.1:8899", "confirmed");
const wallet = loadLocalWallet();

// Load owner keypair
const owner = Keypair.generate();
const ownerPath = "./users/owner.json";

// Write keypair to file
fs.writeFileSync(ownerPath, JSON.stringify(Array.from(owner.secretKey)));

async function main() {
  const vertigo = new VertigoSDK(connection, wallet);

  const signature = await vertigo.Token2022Factory.initialize({
    payer: wallet.payer,
    owner,
    mint: NATIVE_MINT,
    params: FACTORY_PARAMS,
  });

  console.log(signature);
}

main();
