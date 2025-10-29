import { Vertigo } from "../src";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import bs58 from "bs58";

const DIZZY_MINT = new PublicKey(
  "DiZZY2UQ2HSVsFDF6jADc6YYATiTfnQFw4Be1udRZmaY",
);

const main = async () => {
  console.log("🧪 Testing raw create instruction...\n");

  const privateKey = process.env.DEVNET_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("DEVNET_PRIVATE_KEY environment variable not set");
  }

  const ownerKeypair = Keypair.fromSecretKey(bs58.decode(privateKey));
  console.log(`✅ Wallet: ${ownerKeypair.publicKey.toBase58()}`);

  const connection = new Connection(
    "https://api.mainnet-beta.solana.com",
    "confirmed",
  );

  const vertigo = await Vertigo.load({
    connection,
    wallet: new anchor.Wallet(ownerKeypair),
    network: "mainnet",
  });

  // Create a simple token
  const mintKeypair = Keypair.generate();
  const newTokenMint = await createMint(
    connection,
    ownerKeypair,
    ownerKeypair.publicKey,
    null,
    9,
    mintKeypair,
    undefined,
    TOKEN_PROGRAM_ID,
  );

  console.log(`✅ Token: ${newTokenMint.toBase58()}`);

  // Create token account and mint
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    ownerKeypair,
    newTokenMint,
    ownerKeypair.publicKey,
  );

  await mintTo(
    connection,
    ownerKeypair,
    newTokenMint,
    tokenAccount.address,
    ownerKeypair,
    1_000_000_000_000,
    [],
    undefined,
    TOKEN_PROGRAM_ID,
  );

  // Build instruction manually using EXACT IDL field names (snake_case)
  const [pool] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("pool"),
      ownerKeypair.publicKey.toBuffer(),
      DIZZY_MINT.toBuffer(),
      newTokenMint.toBuffer(),
    ],
    vertigo.program.programId,
  );

  const [vaultA] = PublicKey.findProgramAddressSync(
    [pool.toBuffer(), DIZZY_MINT.toBuffer()],
    vertigo.program.programId,
  );

  const [vaultB] = PublicKey.findProgramAddressSync(
    [pool.toBuffer(), newTokenMint.toBuffer()],
    vertigo.program.programId,
  );

  console.log("\n🧪 Trying with snake_case fields (matching IDL exactly)...\n");

  try {
    const ix = await vertigo.program.methods
      .create({
        shift: new anchor.BN(10_000_000_000),
        initial_token_b_reserves: new anchor.BN(1_000_000_000_000), // snake_case!
        fee_params: {
          // snake_case!
          normalization_period: new anchor.BN(3600), // snake_case!
          decay: 0.99,
          reference: new anchor.BN(Math.floor(Date.now() / 1000)),
          royalties_bps: 250, // snake_case!
          privileged_swapper: null, // null instead of undefined
        },
      })
      .accounts({
        payer: ownerKeypair.publicKey,
        owner: ownerKeypair.publicKey,
        tokenWalletAuthority: ownerKeypair.publicKey,
        mintA: DIZZY_MINT,
        mintB: newTokenMint,
        tokenWalletB: tokenAccount.address,
        pool,
        vaultA,
        vaultB,
        tokenProgramA: TOKEN_PROGRAM_ID,
        tokenProgramB: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .instruction();

    console.log("✅ Instruction built successfully with snake_case!");
    console.log(
      "   This means the issue is in the v3 SDK's parameter conversion",
    );

    // Try to simulate
    const tx = new anchor.web3.Transaction().add(ix);
    tx.feePayer = ownerKeypair.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const simulation = await connection.simulateTransaction(tx, [ownerKeypair]);

    if (simulation.value.err) {
      console.log("\n⚠️  Simulation failed:", simulation.value.err);
      console.log("Logs:", simulation.value.logs);
    } else {
      console.log("\n✅ Simulation succeeded!");
      console.log("   The pool creation would work!");
    }
  } catch (error: any) {
    console.error("\n❌ Failed:", error.message);
  }
};

main().catch(console.error);
