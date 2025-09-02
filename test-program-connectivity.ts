import { Connection, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { Keypair } from "@solana/web3.js";
import * as dotenv from "dotenv";
import bs58 from "bs58";

dotenv.config();

const programAddresses = {
  AMM: "vrTGoBuy5rYSxAfV3jaRJWHH6nN9WK4NRExGxsk1bCJ",
  POOL_AUTHORITY: "Vert8xR82wYZrftk7PLcYJNxSdhLCCAMy7zbCNNSS4d",
  PERMISSIONED_RELAY: "FREEXMQuGxqrmT8gKJt82zfJjZACBiR8MNuQCbGSHyzF",
  SPL_TOKEN_FACTORY: "FactRtzKDU69a88rVZbnTofJFSVSDtzEHQG36NigvJjS",
  TOKEN_2022_FACTORY: "FAcTgvrF2jAiPnWEZGLCV3PTQJrypa8GXLFowBv8T4Vs",
};

const main = async () => {
  console.log("🔍 Testing Vertigo Program Connectivity on Devnet\n");

  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  
  // Load wallet from environment
  const privateKey = process.env.DEVNET_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("DEVNET_PRIVATE_KEY not found in environment");
  }
  
  const keypair = Keypair.fromSecretKey(bs58.decode(privateKey));
  const wallet = new NodeWallet(keypair);
  console.log(`Wallet: ${wallet.publicKey.toBase58()}\n`);

  // Check each program
  for (const [name, address] of Object.entries(programAddresses)) {
    console.log(`Checking ${name}: ${address}`);
    try {
      const programId = new PublicKey(address);
      const accountInfo = await connection.getAccountInfo(programId);
      
      if (accountInfo) {
        console.log(`✅ Program exists on devnet`);
        console.log(`   - Owner: ${accountInfo.owner.toBase58()}`);
        console.log(`   - Executable: ${accountInfo.executable}`);
        console.log(`   - Data length: ${accountInfo.data.length} bytes`);
        
        // Check if it's a BPF upgradeable program
        if (accountInfo.owner.toBase58() === "BPFLoaderUpgradeab1e11111111111111111111111") {
          console.log(`   - Type: BPF Upgradeable Program`);
        }
      } else {
        console.log(`❌ Program not found on devnet`);
      }
    } catch (error) {
      console.log(`❌ Error checking program: ${error.message}`);
    }
    console.log();
  }

  // Try to fetch IDL from the chain (if deployed)
  console.log("Attempting to fetch IDLs from chain...\n");
  
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });

  for (const [name, address] of Object.entries(programAddresses)) {
    try {
      const programId = new PublicKey(address);
      const idl = await anchor.Program.fetchIdl(programId, provider);
      
      if (idl) {
        console.log(`✅ IDL found for ${name}`);
        console.log(`   - Name: ${idl.name}`);
        console.log(`   - Version: ${idl.version}`);
        console.log(`   - Instructions: ${idl.instructions?.length || 0}`);
        console.log(`   - Accounts: ${idl.accounts?.length || 0}`);
        
        // Save the IDL to a file
        const fs = await import("fs");
        const path = await import("path");
        const idlName = idl.name || name.toLowerCase().replace(/_/g, '-');
        const idlPath = path.join("idl", `${idlName}_from_chain.json`);
        fs.writeFileSync(idlPath, JSON.stringify(idl, null, 2));
        console.log(`   - Saved to: ${idlPath}`);
      } else {
        console.log(`⚠️  No IDL found on chain for ${name}`);
      }
    } catch (error) {
      console.log(`⚠️  Could not fetch IDL for ${name}: ${error.message}`);
    }
    console.log();
  }
};

main().catch(console.error);