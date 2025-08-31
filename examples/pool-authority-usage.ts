/**
 * Example: Using the Pool Authority Client
 * 
 * The Pool Authority is separated from the main Vertigo SDK to avoid confusion
 * for regular users. It's only needed for advanced pool management features.
 */

import { Connection, Keypair } from '@solana/web3.js';
import { Vertigo, PoolAuthority } from '@vertigo/sdk';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  // Setup connection
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  // Load wallet from environment or create new
  const wallet = process.env.WALLET_PRIVATE_KEY 
    ? Keypair.fromSecretKey(Buffer.from(process.env.WALLET_PRIVATE_KEY, 'base64'))
    : Keypair.generate();
  
  console.log('Wallet:', wallet.publicKey.toBase58());
  
  // Example 1: Regular SDK usage (most users only need this)
  console.log('\n=== Regular Vertigo SDK Usage ===');
  const vertigo = await Vertigo.load({
    connection,
    wallet,
    network: 'devnet',
  });
  
  // Use normal SDK features
  const pools = await vertigo.pools.findAll({ limit: 5 });
  console.log(`Found ${pools.length} pools`);
  
  // Example 2: Pool Authority usage (advanced users only)
  console.log('\n=== Pool Authority Usage (Advanced) ===');
  const poolAuthority = await PoolAuthority.load({
    connection,
    wallet,
    network: 'devnet',
  });
  
  // Check if wallet has pool authority
  const hasAuthority = await poolAuthority.hasAuthority(wallet.publicKey);
  console.log('Has Pool Authority:', hasAuthority);
  
  if (!hasAuthority) {
    console.log('\nTo create a pool authority, you would run:');
    console.log(`
    const { signature, authority } = await poolAuthority.createAuthority({
      owner: wallet.publicKey,
      feeRecipient: wallet.publicKey,
      defaultFeeRate: 30, // 0.3%
    });
    `);
  } else {
    // If authority exists, fetch its data
    const [authorityPda] = poolAuthority.deriveAuthorityPDA(wallet.publicKey);
    const authorityData = await poolAuthority.getAuthority(authorityPda);
    console.log('Authority Data:', {
      owner: authorityData.owner.toBase58(),
      feeRecipient: authorityData.feeRecipient.toBase58(),
      defaultFeeRate: authorityData.defaultFeeRate,
    });
  }
  
  // List all authorities for the wallet
  const authorities = await poolAuthority.listAuthoritiesForOwner(wallet.publicKey);
  console.log(`\nWallet owns ${authorities.length} pool authorities`);
}

// Usage comparison
console.log(`
=== SDK Import Patterns ===

// For regular users (99% of use cases):
import { Vertigo } from '@vertigo/sdk';
const client = await Vertigo.load({ connection, wallet });

// For advanced users who need pool authority features:
import { PoolAuthority } from '@vertigo/sdk';
const poolAuth = await PoolAuthority.load({ connection, wallet });

// Both can be used together if needed:
import { Vertigo, PoolAuthority } from '@vertigo/sdk';
`);

main().catch(console.error);