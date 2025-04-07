import { VertigoSDK } from "@vertigo-amm/vertigo-sdk";
import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import {
  createAssociatedTokenAccount,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  NATIVE_MINT,
} from "@solana/spl-token";
import fs from "fs";
import os from "os";

import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";

const DECIMALS = 6;

const POOL_PARAMS = {
  shift: new anchor.BN(LAMPORTS_PER_SOL).muln(100), // 100 virtual SOL
  initialTokenBReserves: new anchor.BN(1_000_000_000).muln(10 ** DECIMALS), // 1 billion tokens
  feeParams: {
    normalizationPeriod: new anchor.BN(20), // 20 slots
    decay: 10,
    royaltiesBps: 100, // 1%
    reference: new anchor.BN(0),
    privilegedSwapper: null,
  },
};

async function main() {
  // wallet is loaded from local machine
  const pathToWallet = `${os.homedir()}/.config/solana/id.json`;
  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(pathToWallet, "utf-8")))
  );
  const wallet = new anchor.Wallet(walletKeypair);

  const connection = new Connection("http://127.0.0.1:8899", "confirmed");

  // initialize SDK
  const vertigo = new VertigoSDK(connection, wallet);

  // generate keypairs if needed
  const owner = Keypair.generate();
  const user = Keypair.generate();
  const tokenWalletAuthority = Keypair.generate();
  const mintAuthority = Keypair.generate();
  const mint = Keypair.generate();

  // fund accounts if needed
  await connection.requestAirdrop(owner.publicKey, LAMPORTS_PER_SOL * 10);
  await connection.requestAirdrop(user.publicKey, LAMPORTS_PER_SOL * 10);
  await connection.requestAirdrop(
    tokenWalletAuthority.publicKey,
    LAMPORTS_PER_SOL * 10
  );
  await connection.requestAirdrop(
    mintAuthority.publicKey,
    LAMPORTS_PER_SOL * 10
  );

  // mintA is the associated token for SOL, also known as "wrapped SOL"
  const mintA = NATIVE_MINT;

  // mintB is a custom token created for this example
  const mintB = await createMint(
    connection,
    wallet.payer, // payer
    mintAuthority.publicKey, // mint authority
    null, // no freeze authority
    DECIMALS, // number of decimal places
    mint, // token wallet
    null, // no freeze authority
    TOKEN_2022_PROGRAM_ID // this example uses the TOKEN_2022 program for the custom token
  );

  // create the token wallet for the mint
  const tokenWallet = await createAssociatedTokenAccount(
    connection,
    wallet.payer,
    mint.publicKey,
    tokenWalletAuthority.publicKey,
    null,
    TOKEN_2022_PROGRAM_ID
  );

  // mint tokens to the wallet wallet
  await mintTo(
    connection, // connection
    wallet.payer, // payer
    mint.publicKey, // mint
    tokenWallet, // token wallet
    mintAuthority.publicKey, // token wallet authority
    1_000_000_000, // amount of tokens to mint
    [mintAuthority], // mint authority
    null, // no decimals
    TOKEN_2022_PROGRAM_ID // this example uses the TOKEN_2022 program for the custom token
  );

  // create the dev SOL token account, you'll need to fund
  // this account for tx to succeed (not shown in example)
  const userTaA = await getOrCreateAssociatedTokenAccount(
    connection,
    wallet.payer,
    NATIVE_MINT,
    user.publicKey,
    false
  );

  // creat the dev MintB token account
  const userTaB = await getOrCreateAssociatedTokenAccount(
    connection,
    wallet.payer,
    mintB,
    user.publicKey,
    false,
    undefined,
    undefined,
    TOKEN_2022_PROGRAM_ID
  );

  const { signature, poolAddress } = await vertigo.launchPool({
    // Pool configuration
    poolParams: POOL_PARAMS,

    // Authority configuration
    payer: owner, // wallet is the payer
    owner, // wallet is also the owner in this example
    tokenWalletAuthority, // token wallet authority

    // Token configuration
    tokenWalletB: tokenWallet, // token wallet
    mintA, // wSOL mint
    mintB, // custom token mint
    tokenProgramA: TOKEN_PROGRAM_ID, // TOKEN_PROGRAM for wSOL
    tokenProgramB: TOKEN_2022_PROGRAM_ID, // TOKEN_2022 for custom token
    devBuyAmount: new anchor.BN(LAMPORTS_PER_SOL).muln(1), // 1 virtual SOL
    dev: user, // User performing buy/sell
    devTaA: userTaA.address, // Dev SOL token account
    devTaB: userTaB.address, // Dev custom token account
  });
  console.log(`Transaction signature: ${signature}`);
  console.log(`Pool address: ${poolAddress}`);
}

main();
