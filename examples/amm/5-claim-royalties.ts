import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import { NATIVE_MINT } from "@solana/spl-token";

import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { loadLocalWallet } from "../utils";
import fs from "node:fs";
import { VertigoSDK } from "../../src";

const ADDRESSES = JSON.parse(fs.readFileSync("./addresses.json", "utf-8"));
const POOL_ADDRESS = JSON.parse(
  fs.readFileSync("./pool-address.json", "utf-8")
);

async function main() {
  // Connect to Solana
  const connection = new Connection("http://127.0.0.1:8899", "confirmed");
  const wallet = loadLocalWallet();

  // load keypairs from files
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

  const vertigo = new VertigoSDK(connection, wallet, {
    logLevel: "tx",
  });

  const beforeBalance = await connection.getTokenAccountBalance(
    new PublicKey(ADDRESSES.USER_TAA_ACCOUNT)
  );

  await vertigo.claimRoyalties({
    pool: new PublicKey(POOL_ADDRESS.POOL),
    claimer: owner,
    mintA: NATIVE_MINT,
    receiverTaA: new PublicKey(ADDRESSES.USER_TAA_ACCOUNT),
    tokenProgramA: TOKEN_PROGRAM_ID,
  });

  const afterBalance = await connection.getTokenAccountBalance(
    new PublicKey(ADDRESSES.USER_TAA_ACCOUNT)
  );
  console.log(
    `wSOL claimed: ${
      (Number(afterBalance.value.amount) - Number(beforeBalance.value.amount)) /
      LAMPORTS_PER_SOL
    }`
  );
}

main();
