import {
  Connection,
  Keypair,
  PublicKey,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { VertigoSDK } from "@vertigo-amm/vertigo-sdk";
import fs from "fs";

async function main() {
  // Connect to Solana
  const connection = new Connection("http://127.0.0.1:8899", "confirmed");

  const pathToWallet = `${os.homedir()}/.config/solana/id.json`;
  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(pathToWallet, "utf-8")))
  );
  const wallet = new anchor.Wallet(walletKeypair);

  const vertigo = new VertigoSDK(connection, wallet);

  // load Keypair of the wallet that owns the pool
  const owner = ...

  // the address of the pool
  const poolAddress = new PublicKey(<"pool-address>");
  
  const mintA = new PublicKey("<mintA address>");

  // execute the transaction
  await vertigo.claimRoyalties({
    pool: poolAddress,
    claimer: owner,
    mintA,
    receiverTaA: new PublicKey("<receiver TaA address>"),
    tokenProgramA: TOKEN_PROGRAM_ID,
  });
}

main();