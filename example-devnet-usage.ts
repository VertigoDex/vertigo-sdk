#!/usr/bin/env tsx

/**
 * Example: How to use Vertigo SDK with deployed programs on Solana Devnet
 * 
 * This example demonstrates connecting to the deployed Vertigo programs on devnet
 * and shows the available functionality.
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet';
import * as dotenv from 'dotenv';
import bs58 from 'bs58';
import chalk from 'chalk';

dotenv.config();

// Vertigo Program Addresses on Devnet
const PROGRAMS = {
  AMM: new PublicKey('vrTGoBuy5rYSxAfV3jaRJWHH6nN9WK4NRExGxsk1bCJ'),
  POOL_AUTHORITY: new PublicKey('Vert8xR82wYZrftk7PLcYJNxSdhLCCAMy7zbCNNSS4d'),
  PERMISSIONED_RELAY: new PublicKey('FREEXMQuGxqrmT8gKJt82zfJjZACBiR8MNuQCbGSHyzF'),
  SPL_TOKEN_FACTORY: new PublicKey('FactRtzKDU69a88rVZbnTofJFSVSDtzEHQG36NigvJjS'),
  TOKEN_2022_FACTORY: new PublicKey('FAcTgvrF2jAiPnWEZGLCV3PTQJrypa8GXLFowBv8T4Vs'),
};

async function main() {
  console.log(chalk.cyan.bold('\n🚀 Vertigo SDK - Devnet Example\n'));
  
  // 1. Setup Connection
  console.log(chalk.blue('1. Setting up connection...'));
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  console.log(chalk.green('✅ Connected to Solana Devnet'));
  
  // 2. Setup Wallet
  console.log(chalk.blue('\n2. Setting up wallet...'));
  
  let keypair: Keypair;
  if (process.env.DEVNET_PRIVATE_KEY) {
    const privateKeyBytes = bs58.decode(process.env.DEVNET_PRIVATE_KEY);
    keypair = Keypair.fromSecretKey(privateKeyBytes);
    console.log(chalk.green('✅ Wallet loaded from environment'));
  } else {
    keypair = Keypair.generate();
    console.log(chalk.yellow('⚠️  Using ephemeral wallet (no private key in .env)'));
    console.log(chalk.gray('   Add DEVNET_PRIVATE_KEY to .env to use your wallet'));
  }
  
  const wallet = new NodeWallet(keypair);
  console.log(chalk.gray(`   Address: ${wallet.publicKey.toBase58()}`));
  
  const balance = await connection.getBalance(wallet.publicKey);
  console.log(chalk.gray(`   Balance: ${balance / 1e9} SOL`));
  
  if (balance === 0) {
    console.log(chalk.yellow('\n⚠️  Wallet has 0 SOL. Request an airdrop:'));
    console.log(chalk.gray(`   solana airdrop 5 ${wallet.publicKey.toBase58()} --url devnet`));
  }
  
  // 3. Create Anchor Provider
  console.log(chalk.blue('\n3. Creating Anchor provider...'));
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
  });
  anchor.setProvider(provider);
  console.log(chalk.green('✅ Provider created'));
  
  // 4. Verify Programs are Deployed
  console.log(chalk.blue('\n4. Verifying deployed programs...'));
  
  for (const [name, programId] of Object.entries(PROGRAMS)) {
    const accountInfo = await connection.getAccountInfo(programId);
    if (accountInfo && accountInfo.executable) {
      console.log(chalk.green(`✅ ${name}: ${programId.toBase58()}`));
    } else {
      console.log(chalk.red(`❌ ${name}: Not found`));
    }
  }
  
  // 5. Fetch and Display AMM IDL
  console.log(chalk.blue('\n5. Fetching AMM IDL from chain...'));
  
  try {
    const idl = await anchor.Program.fetchIdl(PROGRAMS.AMM, provider);
    
    if (idl) {
      console.log(chalk.green('✅ AMM IDL fetched successfully'));
      console.log(chalk.gray('\nAvailable AMM Instructions:'));
      
      for (const instruction of idl.instructions || []) {
        console.log(chalk.gray(`   • ${instruction.name}`));
        
        // Show instruction parameters
        if (instruction.args && instruction.args.length > 0) {
          console.log(chalk.gray(`     Parameters:`));
          for (const arg of instruction.args) {
            console.log(chalk.gray(`       - ${arg.name}: ${JSON.stringify(arg.type)}`));
          }
        }
      }
    }
  } catch (error: any) {
    console.log(chalk.red(`❌ Error fetching IDL: ${error.message}`));
  }
  
  // 6. Example: How to interact with programs (conceptual)
  console.log(chalk.blue('\n6. How to interact with Vertigo programs:'));
  
  console.log(chalk.gray(`
// Example: Initialize a pool (conceptual)
const initializePool = async () => {
  // 1. Create token mints for your pool
  const mintA = new PublicKey('...');
  const mintB = new PublicKey('...');
  
  // 2. Derive pool PDA
  const [poolPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('pool'),
      wallet.publicKey.toBuffer(),
      mintA.toBuffer(),
      mintB.toBuffer(),
    ],
    PROGRAMS.AMM
  );
  
  // 3. Build and send transaction
  // Note: Actual implementation requires proper IDL types
  // This is just a conceptual example
};

// Example: Swap tokens (conceptual)
const swapTokens = async () => {
  // 1. Get pool information
  // 2. Calculate swap amounts
  // 3. Build swap instruction
  // 4. Send transaction
};
  `));
  
  // 7. Using the SDK (when IDL issues are resolved)
  console.log(chalk.blue('\n7. Using Vertigo SDK (future):'));
  
  console.log(chalk.gray(`
// Once IDL compatibility is resolved:
import { VertigoClient } from '@vertigo/sdk';

const client = await VertigoClient.load({
  network: 'devnet',
  connection,
  wallet: keypair,
});

// Swap tokens
const swapResult = await client.swap.execute({
  tokenIn: mintA,
  tokenOut: mintB,
  amountIn: 1000000000n,
  slippageBps: 50,
});

// Add liquidity
const liquidityResult = await client.pools.addLiquidity({
  pool: poolAddress,
  amountA: 1000000000n,
  amountB: 2000000000n,
});
  `));
  
  console.log(chalk.cyan.bold('\n✅ Example completed successfully!\n'));
  
  console.log(chalk.gray('Next steps:'));
  console.log(chalk.gray('1. Ensure you have SOL in your wallet'));
  console.log(chalk.gray('2. Deploy or find existing pools to interact with'));
  console.log(chalk.gray('3. Use the SDK methods to swap, add/remove liquidity'));
  console.log(chalk.gray('\nFor more information, see the documentation.'));
}

main().catch((error) => {
  console.error(chalk.red('\n❌ Error:'), error);
  process.exit(1);
});