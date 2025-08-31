import { Connection, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { Keypair } from "@solana/web3.js";
import * as dotenv from "dotenv";
import bs58 from "bs58";

dotenv.config();

const main = async () => {
  console.log("Testing minimal SDK initialization...\n");

  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  
  // Load wallet from environment
  const privateKey = process.env.DEVNET_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("DEVNET_PRIVATE_KEY not found in environment");
  }
  
  const keypair = Keypair.fromSecretKey(bs58.decode(privateKey));
  const wallet = new NodeWallet(keypair);
  console.log(`Wallet: ${wallet.publicKey.toBase58()}\n`);

  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });

  // Try to initialize each program separately
  const programs = [
    { name: "amm", address: "vrTGoBuy5rYSxAfV3jaRJWHH6nN9WK4NRExGxsk1bCJ" },
    { name: "pool_authority", address: "Vert8xR82wYZrftk7PLcYJNxSdhLCCAMy7zbCNNSS4d" },
    { name: "permissioned_relay", address: "FREEXMQuGxqrmT8gKJt82zfJjZACBiR8MNuQCbGSHyzF" },
    { name: "spl_token_factory", address: "FactRtzKDU69a88rVZbnTofJFSVSDtzEHQG36NigvJjS" },
    { name: "token_2022_factory", address: "FAcTgvrF2jAiPnWEZGLCV3PTQJrypa8GXLFowBv8T4Vs" },
  ];

  for (const prog of programs) {
    console.log(`Testing ${prog.name}...`);
    try {
      const idl = require(`./target/idl/${prog.name}.json`);
      console.log(`  IDL loaded: ${idl.instructions?.length || 0} instructions, ${idl.accounts?.length || 0} accounts`);
      
      const programId = new PublicKey(prog.address);
      const program = new anchor.Program(idl, programId, provider);
      
      console.log(`  ✅ Program initialized successfully`);
      console.log(`  - Instructions: ${Object.keys(program.methods || {}).length}`);
      console.log(`  - Accounts: ${Object.keys(program.account || {}).length}`);
    } catch (error) {
      console.log(`  ❌ Failed: ${error.message}`);
    }
    console.log();
  }

  // Now try the VertigoClient
  console.log("Testing VertigoClient initialization...");
  try {
    const { VertigoClient } = await import("./src/client/VertigoClient");
    const client = await VertigoClient.load("devnet", wallet);
    console.log("✅ VertigoClient initialized successfully!");
  } catch (error) {
    console.log(`❌ VertigoClient failed: ${error.message}`);
    console.log(error.stack);
  }
};

main().catch(console.error);