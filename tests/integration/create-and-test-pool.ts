#!/usr/bin/env tsx

/**
 * Create and Test Pool Script
 * 
 * This script creates a pool using the Vertigo AMM and then tests swap functionality.
 * Since the IDL has compatibility issues, we'll use the program's actual methods.
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  TransactionInstruction
} from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet';
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

// Vertigo Programs
const PROGRAMS = {
  AMM: new PublicKey('vrTGoBuy5rYSxAfV3jaRJWHH6nN9WK4NRExGxsk1bCJ'),
};

/**
 * Create a pool and test swap
 */
async function createAndTestPool() {
  console.log(chalk.cyan.bold('\n🏊 Vertigo AMM - Create Pool & Test Swap\n'));
  console.log(chalk.gray('─'.repeat(60)));

  try {
    // 1. Setup
    console.log(chalk.blue('\n1️⃣  Setting up connection and wallet...'));
    
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    
    if (!process.env.DEVNET_PRIVATE_KEY) {
      throw new Error('DEVNET_PRIVATE_KEY not found in .env file');
    }
    
    const privateKeyBytes = bs58.decode(process.env.DEVNET_PRIVATE_KEY);
    const wallet = Keypair.fromSecretKey(privateKeyBytes);
    const nodeWallet = new NodeWallet(wallet);
    
    console.log(chalk.gray(`Wallet: ${wallet.publicKey.toBase58()}`));
    
    const balance = await connection.getBalance(wallet.publicKey);
    console.log(chalk.gray(`Balance: ${balance / LAMPORTS_PER_SOL} SOL`));
    
    if (balance < 0.5 * LAMPORTS_PER_SOL) {
      console.log(chalk.red('\n❌ Insufficient balance (need at least 0.5 SOL)'));
      return;
    }
    
    // 2. Setup Anchor provider and load IDL
    console.log(chalk.blue('\n2️⃣  Setting up Anchor provider...'));
    
    const provider = new anchor.AnchorProvider(connection, nodeWallet, {
      commitment: 'confirmed',
    });
    anchor.setProvider(provider);
    
    // Try to fetch IDL from chain
    let program: anchor.Program | null = null;
    try {
      const idl = await anchor.Program.fetchIdl(PROGRAMS.AMM, provider);
      if (idl) {
        program = new anchor.Program(idl as any, PROGRAMS.AMM, provider);
        console.log(chalk.green('✅ AMM program loaded'));
      }
    } catch (error) {
      console.log(chalk.yellow('⚠️  Could not load IDL, will use manual approach'));
    }
    
    // 3. Create tokens
    console.log(chalk.blue('\n3️⃣  Creating test tokens...'));
    
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
    
    // 4. Create token accounts and mint
    console.log(chalk.blue('\n4️⃣  Creating token accounts and minting...'));
    
    const tokenAccountA = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet,
      mintA,
      wallet.publicKey
    );
    
    const tokenAccountB = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet,
      mintB,
      wallet.publicKey
    );
    
    await mintTo(
      connection,
      wallet,
      mintA,
      tokenAccountA.address,
      wallet.publicKey,
      1000 * 10**9
    );
    console.log(chalk.green('✅ Minted 1000 Token A'));
    
    await mintTo(
      connection,
      wallet,
      mintB,
      tokenAccountB.address,
      wallet.publicKey,
      1000 * 10**6
    );
    console.log(chalk.green('✅ Minted 1000 Token B'));
    
    // 5. Create pool using program
    console.log(chalk.blue('\n5️⃣  Creating pool...'));
    
    if (program) {
      try {
        // Derive pool PDA
        const [poolPda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from('pool'),
            wallet.publicKey.toBuffer(),
            mintA.toBuffer(),
            mintB.toBuffer(),
          ],
          PROGRAMS.AMM
        );
        
        console.log(chalk.gray(`Pool PDA: ${poolPda.toBase58()}`));
        
        // Check if pool exists
        const poolAccount = await connection.getAccountInfo(poolPda);
        if (poolAccount) {
          console.log(chalk.yellow('⚠️  Pool already exists!'));
        } else {
          // Derive vault addresses
          const [vaultA] = PublicKey.findProgramAddressSync(
            [
              Buffer.from('vault'),
              poolPda.toBuffer(),
              mintA.toBuffer(),
            ],
            PROGRAMS.AMM
          );
          
          const [vaultB] = PublicKey.findProgramAddressSync(
            [
              Buffer.from('vault'),
              poolPda.toBuffer(),
              mintB.toBuffer(),
            ],
            PROGRAMS.AMM
          );
          
          console.log(chalk.gray(`Vault A: ${vaultA.toBase58().slice(0, 16)}...`));
          console.log(chalk.gray(`Vault B: ${vaultB.toBase58().slice(0, 16)}...`));
          
          // Create the pool
          const createParams = {
            shift: new anchor.BN(0),
            initialTokenBReserves: new anchor.BN(100 * 10**6), // 100 Token B
            feeParams: {
              normalizationPeriod: new anchor.BN(100),
              decay: 0.5,
              reference: new anchor.BN(0),
              royaltiesBps: 100,
              privilegedSwapper: null,
            }
          };
          
          console.log(chalk.yellow('🚀 Attempting to create pool...'));
          
          try {
            const tx = await program.methods
              .create(createParams)
              .accounts({
                payer: wallet.publicKey,
                owner: wallet.publicKey,
                tokenWalletAuthority: wallet.publicKey,
                mintA: mintA,
                mintB: mintB,
                tokenWalletB: tokenAccountB.address,
                pool: poolPda,
                vaultA: vaultA,
                vaultB: vaultB,
                systemProgram: SystemProgram.programId,
                tokenProgram: TOKEN_PROGRAM_ID,
              })
              .rpc();
            
            console.log(chalk.green('✅ Pool created successfully!'));
            console.log(chalk.gray(`   Transaction: ${tx.slice(0, 16)}...`));
            
            // 6. Test swap
            console.log(chalk.blue('\n6️⃣  Testing swap...'));
            
            const swapParams = {
              minOut: new anchor.BN(0),
              expiration: new anchor.BN(Math.floor(Date.now() / 1000) + 3600),
            };
            
            console.log(chalk.yellow('🔄 Executing swap...'));
            
            const swapTx = await program.methods
              .buy(swapParams)
              .accounts({
                buyer: wallet.publicKey,
                pool: poolPda,
                mintA: mintA,
                mintB: mintB,
                buyerTokenWalletA: tokenAccountA.address,
                buyerTokenWalletB: tokenAccountB.address,
                vaultA: vaultA,
                vaultB: vaultB,
                systemProgram: SystemProgram.programId,
                tokenProgram: TOKEN_PROGRAM_ID,
              })
              .rpc();
            
            console.log(chalk.green('✅ Swap executed successfully!'));
            console.log(chalk.gray(`   Transaction: ${swapTx.slice(0, 16)}...`));
            
          } catch (txError: any) {
            console.log(chalk.red(`❌ Transaction failed: ${txError.message}`));
            if (txError.logs) {
              console.log(chalk.gray('Logs:'));
              txError.logs.forEach((log: string) => console.log(chalk.gray(`  ${log}`)));
            }
          }
        }
        
      } catch (error: any) {
        console.log(chalk.red(`❌ Pool operation failed: ${error.message}`));
      }
    } else {
      console.log(chalk.yellow('⚠️  Cannot create pool without proper IDL'));
      console.log(chalk.gray('The program requires specific instruction encoding'));
      
      // Still provide the information
      const [poolPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('pool'),
          wallet.publicKey.toBuffer(),
          mintA.toBuffer(),
          mintB.toBuffer(),
        ],
        PROGRAMS.AMM
      );
      
      console.log(chalk.gray(`\nPool would be created at: ${poolPda.toBase58()}`));
      console.log(chalk.gray(`Token A: ${mintA.toBase58()}`));
      console.log(chalk.gray(`Token B: ${mintB.toBase58()}`));
    }
    
    // 7. Summary
    console.log(chalk.blue('\n7️⃣  Summary'));
    console.log(chalk.gray('─'.repeat(60)));
    
    console.log(chalk.cyan('\nCreated Resources:'));
    console.log(chalk.gray(`Token A: ${mintA.toBase58()}`));
    console.log(chalk.gray(`Token B: ${mintB.toBase58()}`));
    console.log(chalk.gray(`Token Account A: ${tokenAccountA.address.toBase58()}`));
    console.log(chalk.gray(`Token Account B: ${tokenAccountB.address.toBase58()}`));
    
    const [poolPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('pool'),
        wallet.publicKey.toBuffer(),
        mintA.toBuffer(),
        mintB.toBuffer(),
      ],
      PROGRAMS.AMM
    );
    console.log(chalk.gray(`Pool PDA: ${poolPda.toBase58()}`));
    
  } catch (error: any) {
    console.error(chalk.red('\n❌ Error:'), error.message);
    if (error.logs) {
      console.error(chalk.red('Logs:'), error.logs);
    }
  }
}

// Run the script
if (require.main === module) {
  createAndTestPool()
    .then(() => {
      console.log(chalk.cyan('\n✨ Done!\n'));
      process.exit(0);
    })
    .catch((error) => {
      console.error(chalk.red('Fatal error:'), error);
      process.exit(1);
    });
}

export { createAndTestPool };