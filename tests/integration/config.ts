import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';

export const DEVNET_CONFIG = {
  RPC_ENDPOINT: 'https://api.devnet.solana.com',
  COMMITMENT: 'confirmed' as anchor.web3.Commitment,
  
  // Well-known devnet tokens for testing
  TOKENS: {
    SOL: 'So11111111111111111111111111111111111111112',
    USDC: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vgs8Z5VU9', // Devnet USDC
    USDT: '8PMHT4swUMtBzgHnh5U564N5sjPSiUz2cjEQzFnnP1Fo', // Devnet USDT
  },
  
  // Test wallet configuration
  TEST_WALLET: {
    // This should be replaced with a funded devnet wallet
    // You can use: solana-keygen new --outfile devnet-wallet.json
    // Then: solana airdrop 2 <pubkey> --url devnet
    PRIVATE_KEY: process.env.DEVNET_PRIVATE_KEY || '',
  },
  
  // Transaction settings
  TX_OPTIONS: {
    skipPreflight: false,
    preflightCommitment: 'confirmed' as anchor.web3.Commitment,
    maxRetries: 3,
  },
  
  // Timeout settings (ms)
  TIMEOUTS: {
    TRANSACTION: 30000,
    CONFIRMATION: 60000,
    TEST: 120000,
  },
};

export const setupConnection = (): Connection => {
  return new Connection(DEVNET_CONFIG.RPC_ENDPOINT, {
    commitment: DEVNET_CONFIG.COMMITMENT,
    confirmTransactionInitialTimeout: DEVNET_CONFIG.TIMEOUTS.CONFIRMATION,
  });
};

export const setupWallet = (): Keypair => {
  if (!DEVNET_CONFIG.TEST_WALLET.PRIVATE_KEY) {
    throw new Error(
      'Please set DEVNET_PRIVATE_KEY environment variable with a base58 encoded private key'
    );
  }
  
  try {
    const privateKeyBytes = anchor.utils.bytes.bs58.decode(
      DEVNET_CONFIG.TEST_WALLET.PRIVATE_KEY
    );
    return Keypair.fromSecretKey(privateKeyBytes);
  } catch (error) {
    throw new Error(`Invalid private key format: ${error}`);
  }
};

export const waitForTransaction = async (
  connection: Connection,
  signature: string,
  commitment: anchor.web3.Commitment = 'confirmed'
): Promise<void> => {
  const latestBlockhash = await connection.getLatestBlockhash();
  await connection.confirmTransaction(
    {
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    },
    commitment
  );
};

export const fundWallet = async (
  connection: Connection,
  wallet: PublicKey,
  lamports: number = 2 * anchor.web3.LAMPORTS_PER_SOL
): Promise<void> => {
  console.log(`Requesting airdrop of ${lamports / anchor.web3.LAMPORTS_PER_SOL} SOL to ${wallet.toBase58()}`);
  const signature = await connection.requestAirdrop(wallet, lamports);
  await waitForTransaction(connection, signature);
  console.log('Airdrop confirmed');
};