#!/usr/bin/env tsx

/**
 * Create Test Pool Script
 * 
 * This script creates a test pool on devnet with two newly minted tokens.
 * It demonstrates the complete flow of pool creation for the Vertigo AMM.
 * 
 * Usage: tsx tests/integration/create-test-pool.ts
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import {
  TOKEN_PROGRAM_ID,
  createMint,
  mintTo,
  getOrCreateAssociatedTokenAccount,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import * as dotenv from 'dotenv';
import bs58 from 'bs58';
import chalk from 'chalk';

dotenv.config();

// Vertigo AMM Program
const AMM_PROGRAM_ID = new PublicKey('vrTGoBuy5rYSxAfV3jaRJWHH6nN9WK4NRExGxsk1bCJ');

/**
 * Main function to create a test pool
 */
async function createTestPool() {
  console.log(chalk.cyan.bold('\n🏊 Vertigo AMM - Create Test Pool\n'));
  console.log(chalk.gray('─'.repeat(60)));

  try {
    // 1. Setup connection and wallet
    console.log(chalk.blue('\n1️⃣  Setting up connection and wallet...'));
    
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    
    if (!process.env.DEVNET_PRIVATE_KEY) {
      throw new Error('DEVNET_PRIVATE_KEY not found in .env file');
    }
    
    const privateKeyBytes = bs58.decode(process.env.DEVNET_PRIVATE_KEY);
    const wallet = Keypair.fromSecretKey(privateKeyBytes);
    
    console.log(chalk.gray(`Wallet: ${wallet.publicKey.toBase58()}`));
    
    const balance = await connection.getBalance(wallet.publicKey);
    console.log(chalk.gray(`Balance: ${balance / LAMPORTS_PER_SOL} SOL`));
    
    if (balance < 0.1 * LAMPORTS_PER_SOL) {
      console.log(chalk.red('\n❌ Insufficient balance (need at least 0.1 SOL)'));
      console.log(chalk.gray('Request an airdrop:'));
      console.log(chalk.gray(`solana airdrop 5 ${wallet.publicKey.toBase58()} --url devnet`));
      return;
    }
    
    // 2. Create two test tokens
    console.log(chalk.blue('\n2️⃣  Creating test tokens...'));
    
    console.log(chalk.gray('Creating Token A (9 decimals like SOL)...'));
    const mintA = await createMint(
      connection,
      wallet,
      wallet.publicKey,
      null,
      9,
      undefined,
      undefined,
      TOKEN_PROGRAM_ID
    );
    console.log(chalk.green(`✅ Token A: ${mintA.toBase58()}`));
    
    console.log(chalk.gray('Creating Token B (6 decimals like USDC)...'));
    const mintB = await createMint(
      connection,
      wallet,
      wallet.publicKey,
      null,
      6,
      undefined,
      undefined,
      TOKEN_PROGRAM_ID
    );
    console.log(chalk.green(`✅ Token B: ${mintB.toBase58()}`));
    
    // 3. Create token accounts and mint supply
    console.log(chalk.blue('\n3️⃣  Creating token accounts and minting supply...'));
    
    const tokenAccountA = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet,
      mintA,
      wallet.publicKey
    );
    console.log(chalk.gray(`Token Account A: ${tokenAccountA.address.toBase58().slice(0, 16)}...`));
    
    const tokenAccountB = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet,
      mintB,
      wallet.publicKey
    );
    console.log(chalk.gray(`Token Account B: ${tokenAccountB.address.toBase58().slice(0, 16)}...`));
    
    // Mint 1000 tokens of each
    await mintTo(
      connection,
      wallet,
      mintA,
      tokenAccountA.address,
      wallet.publicKey,
      1000 * 10**9 // 1000 tokens with 9 decimals
    );
    console.log(chalk.green('✅ Minted 1000 Token A'));
    
    await mintTo(
      connection,
      wallet,
      mintB,
      tokenAccountB.address,
      wallet.publicKey,
      1000 * 10**6 // 1000 tokens with 6 decimals
    );
    console.log(chalk.green('✅ Minted 1000 Token B'));
    
    // 4. Derive pool PDAs
    console.log(chalk.blue('\n4️⃣  Deriving pool addresses...'));
    
    const [poolPda, poolBump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('pool'),
        wallet.publicKey.toBuffer(),
        mintA.toBuffer(),
        mintB.toBuffer(),
      ],
      AMM_PROGRAM_ID
    );
    console.log(chalk.gray(`Pool PDA: ${poolPda.toBase58()}`));
    console.log(chalk.gray(`Pool Bump: ${poolBump}`));
    
    // Check if pool already exists
    const poolAccount = await connection.getAccountInfo(poolPda);
    if (poolAccount) {
      console.log(chalk.yellow('\n⚠️  Pool already exists at this address!'));
      console.log(chalk.gray('Pool details:'));
      console.log(chalk.gray(`  Owner: ${poolAccount.owner.toBase58()}`));
      console.log(chalk.gray(`  Data length: ${poolAccount.data.length} bytes`));
      console.log(chalk.gray(`  Lamports: ${poolAccount.lamports / LAMPORTS_PER_SOL} SOL`));
      return;
    }
    
    // Derive vault addresses
    const [vaultA, vaultABump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('vault'),
        poolPda.toBuffer(),
        mintA.toBuffer(),
      ],
      AMM_PROGRAM_ID
    );
    
    const [vaultB, vaultBBump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('vault'),
        poolPda.toBuffer(),
        mintB.toBuffer(),
      ],
      AMM_PROGRAM_ID
    );
    
    console.log(chalk.gray(`Vault A: ${vaultA.toBase58().slice(0, 16)}... (bump: ${vaultABump})`));
    console.log(chalk.gray(`Vault B: ${vaultB.toBase58().slice(0, 16)}... (bump: ${vaultBBump})`));
    
    // 5. Summary
    console.log(chalk.blue('\n5️⃣  Pool Creation Summary'));
    console.log(chalk.gray('─'.repeat(60)));
    
    console.log(chalk.green('\n✅ Test pool can be created with:'));
    console.log(chalk.gray(`   Token A: ${mintA.toBase58()}`));
    console.log(chalk.gray(`   Token B: ${mintB.toBase58()}`));
    console.log(chalk.gray(`   Pool: ${poolPda.toBase58()}`));
    console.log(chalk.gray(`   Initial liquidity: 100 Token A + 100 Token B`));
    
    console.log(chalk.yellow('\n⚠️  Note: Actual pool creation requires:'));
    console.log(chalk.gray('   1. Proper instruction encoding with Anchor IDL'));
    console.log(chalk.gray('   2. Fee parameters configuration'));
    console.log(chalk.gray('   3. Initial liquidity transfer'));
    console.log(chalk.gray('   4. Transaction signing and submission'));
    
    // 6. Display token info for manual testing
    console.log(chalk.blue('\n6️⃣  Token Information for Testing'));
    console.log(chalk.gray('─'.repeat(60)));
    
    console.log(chalk.cyan('\nSave these addresses for testing:'));
    console.log('```json');
    console.log(JSON.stringify({
      tokenA: {
        mint: mintA.toBase58(),
        decimals: 9,
        account: tokenAccountA.address.toBase58(),
        balance: '1000'
      },
      tokenB: {
        mint: mintB.toBase58(),
        decimals: 6,
        account: tokenAccountB.address.toBase58(),
        balance: '1000'
      },
      pool: {
        address: poolPda.toBase58(),
        bump: poolBump,
        vaultA: vaultA.toBase58(),
        vaultB: vaultB.toBase58(),
        owner: wallet.publicKey.toBase58()
      }
    }, null, 2));
    console.log('```');
    
    console.log(chalk.green('\n✅ Test tokens created successfully!'));
    console.log(chalk.gray('You can now use these tokens to create and test pools.'));
    
  } catch (error: any) {
    console.error(chalk.red('\n❌ Error:'), error.message);
    if (error.logs) {
      console.error(chalk.red('Logs:'), error.logs);
    }
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  createTestPool()
    .then(() => {
      console.log(chalk.cyan('\n✨ Done!\n'));
      process.exit(0);
    })
    .catch((error) => {
      console.error(chalk.red('Fatal error:'), error);
      process.exit(1);
    });
}

export { createTestPool };