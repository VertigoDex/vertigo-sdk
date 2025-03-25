import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import {
  createAssociatedTokenAccount,
  createMint,
  getAssociatedTokenAddressSync,
  mintTo,
  NATIVE_MINT,
} from "@solana/spl-token";

import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { fundWsol } from "../../../tests/utils";
import { loadLocalWallet } from "../utils";
import fs from "node:fs";
import { DECIMALS, POOL_PARAMS } from "../consts";

async function main() {
  /*
 1. Initialize the SDK 
 */

  // Connect to Solana
  const connection = new Connection("http://127.0.0.1:8899", "confirmed");
  const wallet = loadLocalWallet();

  /* 
  2. Generate/fund required keypairs 
  and create custom tokens for the pool
  */

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

  // fund the owner and user if needed
  await connection.requestAirdrop(owner.publicKey, LAMPORTS_PER_SOL * 10);
  await connection.requestAirdrop(user.publicKey, LAMPORTS_PER_SOL * 10);

  const mint = Keypair.generate(); // this is the mint for the custom token
  const mintAuthority = Keypair.generate(); // this is the authority for the mint

  // fund the token wallet authority if needed
  await connection.requestAirdrop(
    tokenWalletAuthority.publicKey,
    LAMPORTS_PER_SOL * 10 // 10 SOL
  );

  // Create mint used for the custom token
  await createMint(
    connection,
    wallet.payer, // payer
    mintAuthority.publicKey, // mint authority
    null, // no decimals
    DECIMALS, // number of decimal places
    mint, // token wallet
    null, // no freeze authority
    TOKEN_2022_PROGRAM_ID // this example uses the TOKEN_2022 program for the custom token
  );
  console.log(`Mint created: ${mint.publicKey}`);

  // Create token wallet for the mint
  const tokenWallet = await createAssociatedTokenAccount(
    connection,
    wallet.payer,
    mint.publicKey,
    tokenWalletAuthority.publicKey,
    null,
    TOKEN_2022_PROGRAM_ID
  );
  console.log(`Token wallet created: ${tokenWallet.toString()}`);
  // Mint tokens to the token wallet authority
  const tokensToMint = POOL_PARAMS.initialTokenBReserves.toNumber();

  // Mint tokens to the token wallet authority
  await mintTo(
    connection, // connection
    wallet.payer, // payer
    mint.publicKey, // mint
    tokenWallet, // token wallet
    mintAuthority.publicKey, // token wallet authority
    tokensToMint, // amount of tokens to mint
    [mintAuthority], // mint authority
    null, // no decimals
    TOKEN_2022_PROGRAM_ID // this example uses the TOKEN_2022 program for the custom token
  );
  console.log(`Tokens minted to token wallet: ${tokensToMint}`);

  /* 3. Prepare the dev buy. 
  We need to create the dev token accounts for the wSOL and the custom token
  before launching the pool.
  */

  // Create the dev SOL token account
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
    mint.publicKey,
    user.publicKey,
    null,
    TOKEN_2022_PROGRAM_ID
  );
  console.log(
    `Dev custom token account created: ${devTokenBTokenAccount.toString()}`
  );

  /* Export all addresses and constants for reference */
  const CONSTANTS = {
    OWNER: owner.publicKey.toString(),
    USER: user.publicKey.toString(),
    TOKEN_WALLET_AUTHORITY: tokenWalletAuthority.publicKey.toString(),
    MINT: mint.publicKey.toString(),
    MINT_AUTHORITY: mintAuthority.publicKey.toString(),
    TOKEN_WALLET: tokenWallet.toString(),
    TOKENS_MINTED: tokensToMint.toString(),
    USER_TAA_ACCOUNT: devSolTokenAccount.toString(),
    USER_TAB_TOKEN_ACCOUNT: devTokenBTokenAccount.toString(),
  } as const;
  console.log(CONSTANTS);

  // Write constants to file
  fs.writeFileSync("./addresses.json", JSON.stringify(CONSTANTS, null, 2));
  console.log("Constants written to ./addresses.json");
}

main();
