import { VertigoSDK } from "@vertigo-amm/vertigo-sdk";
import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import {
  createAssociatedTokenAccount,
  createMint,
  getAssociatedTokenAddress,
  mintTo,
  NATIVE_MINT,
  transfer,
} from "@solana/spl-token";
import fs from "node:fs";
import os from "node:os";
import type { PoolConfig } from "../src/types/pool";
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { fundWsol } from "../../tests/utils";

/**
 * This example shows how to launch a liquidity pool for SOL and a custom token
 *
 * Lets call the custom token "TokenB". It will have a supply of 1 billion tokens,
 * and uses the TOKEN_2022 program (although it can be any SPL token program).
 *
 * The pool will be launched with the following parameters:
 * - 100 virtual SOL constant
 * - 1% royalties fee
 * - 100 normalization period
 * - 10 decay
 * - 1 fee exempt buy
 * - 0 reference
 */

async function main() {
  /*
 1. Initialize the SDK 
 */

  // Connect to Solana
  const connection = new Connection("http://127.0.0.1:8899", "confirmed");

  // Load a wallet from a local file
  const pathToWallet = `${os.homedir()}/.config/solana/id.json`;
  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(pathToWallet, "utf-8")))
  );
  const wallet = new anchor.Wallet(walletKeypair);

  // Initialize Vertigo SDK
  const vertigo = new VertigoSDK(connection);

  /* 
  2. Prepare relevant params for pool and mint 
  */

  // Number of decimal places for the token mint
  const DECIMALS = 6;

  // Pool configuration parameters
  const POOL_PARAMS: PoolConfig = {
    shift: new anchor.BN(LAMPORTS_PER_SOL).muln(100), // 100 virtual SOL
    initialTokenBReserves: new anchor.BN(1_000_000_000).muln(10 ** DECIMALS),
    feeParams: {
      normalizationPeriod: new anchor.BN(50),
      decay: 10,
      royaltiesBps: 100, // 1%
      feeExemptBuys: 1,
      reference: new anchor.BN(0),
    },
  };

  /* 
  3. Generate/fund required keypairs 
  and create custom tokens for the pool
  */

  // Generate required keypairs
  const owner = Keypair.generate(); // this is the owner of the pool
  const tokenWalletAuthority = Keypair.generate(); // this is the authority for the token wallet
  const mint = Keypair.generate(); // this is the mint for the custom token
  const mintAuthority = Keypair.generate(); // this is the authority for the mint
  const user = Keypair.generate(); // this is the user that will be used to buy and sell the custom token

  // fund the owner if needed
  await connection.requestAirdrop(owner.publicKey, LAMPORTS_PER_SOL * 10);

  // fund the user if needed
  await connection.requestAirdrop(user.publicKey, LAMPORTS_PER_SOL * 100);

  // fund the token wallet authority if needed
  await connection.requestAirdrop(
    tokenWalletAuthority.publicKey,
    LAMPORTS_PER_SOL * 10 // 10 SOL
  );

  // Create mint
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
  console.log(`Mint: ${mint.publicKey.toString()}`);

  // Create token wallet
  const tokenWallet = await createAssociatedTokenAccount(
    connection,
    wallet.payer,
    mint.publicKey,
    tokenWalletAuthority.publicKey,
    null,
    TOKEN_2022_PROGRAM_ID
  );
  console.log(`Token wallet: ${tokenWallet.toString()}`);

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

  /* 4. Prepare the dev buy. 
  We need to create the dev token accounts for the wSOL and the custom token
  before launching the pool.
  */

  // Create the dev SOL token account
  const devSolTokenAccount = await createAssociatedTokenAccount(
    connection,
    wallet.payer,
    NATIVE_MINT,
    user.publicKey,
    null,
    TOKEN_PROGRAM_ID
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
  console.log(`Dev SOL token account: ${devSolTokenAccount.toString()}`);

  /* 5. Launch the pool */
  const { signature, poolAddress } = await vertigo.launchPool({
    poolParams: POOL_PARAMS,
    payer: wallet.payer, // wallet is the payer
    owner, // wallet is also the owner in this example
    tokenWalletAuthority, // token wallet authority
    tokenWalletB: tokenWallet, // token wallet
    mintA: NATIVE_MINT, // wSOL mint
    mintB: mint.publicKey, // custom token mint
    tokenProgramA: TOKEN_PROGRAM_ID, // this example uses the TOKEN_PROGRAM for the wSOL
    tokenProgramB: TOKEN_2022_PROGRAM_ID, // this example uses the TOKEN_2022 program for the custom token
    devBuyAmount: new anchor.BN(LAMPORTS_PER_SOL).muln(1), // 1 virtual SOL
    dev: user, // user that will be used to buy and sell the custom token
    devTaA: devSolTokenAccount, // dev SOL token account
    devTaB: devTokenBTokenAccount, // dev custom token account
  });
  console.log(`Transaction signature: ${signature}`);

  /** Try buying from pool */
  const quote = await vertigo.quoteBuy({
    amount: new anchor.BN(LAMPORTS_PER_SOL).muln(1),
    limit: new anchor.BN(0),
    owner: owner.publicKey,
    mintA: NATIVE_MINT,
    mintB: mint.publicKey,
  });
  console.log({
    amountB: quote.amountB.toString(),
    feeA: quote.feeA.toString(),
  });

  for (let i = 0; i < 5; i++) {
    const beforeBalance = await connection.getTokenAccountBalance(
      devTokenBTokenAccount
    );

    await vertigo.buy({
      owner: owner.publicKey,
      user: user,
      mintA: NATIVE_MINT,
      mintB: mint.publicKey,
      userTaA: devSolTokenAccount,
      userTaB: devTokenBTokenAccount,
      tokenProgramA: TOKEN_PROGRAM_ID,
      tokenProgramB: TOKEN_2022_PROGRAM_ID,
      amount: new anchor.BN(LAMPORTS_PER_SOL).muln(1),
      limit: new anchor.BN(0),
    });

    const afterBalance = await connection.getTokenAccountBalance(
      devTokenBTokenAccount
    );
    console.log(
      `Tokens purchased: ${
        Number(afterBalance.value.amount) - Number(beforeBalance.value.amount)
      }`
    );
  }

  /** Try selling to pool */
  const quoteSell = await vertigo.quoteSell({
    amount: new anchor.BN(LAMPORTS_PER_SOL).muln(1),
    limit: new anchor.BN(0),
    owner: owner.publicKey,
    mintA: NATIVE_MINT,
    mintB: mint.publicKey,
  });
  console.log({
    amountA: quoteSell.amountA.toString(),
    feeA: quoteSell.feeA.toString(),
  });

  for (let i = 0; i < 5; i++) {
    const beforeBalance = await connection.getTokenAccountBalance(
      devTokenBTokenAccount
    );

    await vertigo.sell({
      owner: owner.publicKey,
      mintA: NATIVE_MINT,
      mintB: mint.publicKey,
      user: user,
      userTaA: devSolTokenAccount,
      userTaB: devTokenBTokenAccount,
      tokenProgramA: TOKEN_PROGRAM_ID,
      tokenProgramB: TOKEN_2022_PROGRAM_ID,
      amount: new anchor.BN(LAMPORTS_PER_SOL).muln(1),
      limit: new anchor.BN(0),
    });

    const afterBalance = await connection.getTokenAccountBalance(
      devTokenBTokenAccount
    );
    console.log(
      `Tokens sold: ${
        Number(beforeBalance.value.amount) - Number(afterBalance.value.amount)
      }`
    );
  }

  /** Try claiming royalties */
  const beforeBalance = await connection.getTokenAccountBalance(
    devSolTokenAccount
  );

  const claimTx = await vertigo.claimRoyalties({
    pool: poolAddress,
    claimer: owner,
    mintA: NATIVE_MINT,
    receiverTaA: devSolTokenAccount,
    tokenProgramA: TOKEN_PROGRAM_ID,
  });

  const afterBalance = await connection.getTokenAccountBalance(
    devSolTokenAccount
  );
  console.log(
    `wSOL claimed: ${
      (Number(afterBalance.value.amount) - Number(beforeBalance.value.amount)) /
      LAMPORTS_PER_SOL
    }`
  );
}

main();
