import { Connection, PublicKey, Commitment, GetProgramAccountsFilter } from '@solana/web3.js';
import { vi } from 'vitest';
import * as anchor from '@coral-xyz/anchor';

export const createMockConnection = (): Connection => {
  const connection = {
    getBalance: vi.fn().mockResolvedValue(1000000000),
    getMinimumBalanceForRentExemption: vi.fn().mockResolvedValue(2039280),
    getLatestBlockhash: vi.fn().mockResolvedValue({
      blockhash: 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N',
      lastValidBlockHeight: 1000,
    }),
    getRecentPrioritizationFees: vi.fn().mockResolvedValue([
      { prioritizationFee: 1000 },
      { prioritizationFee: 2000 },
      { prioritizationFee: 3000 },
    ]),
    confirmTransaction: vi.fn().mockResolvedValue({ value: { err: null } }),
    sendRawTransaction: vi.fn().mockResolvedValue('mock-signature'),
    simulateTransaction: vi.fn().mockResolvedValue({
      value: {
        err: null,
        logs: ['Program log: Instruction: Swap'],
        unitsConsumed: 100000,
      },
    }),
    getAccountInfo: vi.fn().mockResolvedValue(null),
    getParsedTokenAccountsByOwner: vi.fn().mockResolvedValue({
      value: [],
    }),
    getSignatureStatus: vi.fn().mockResolvedValue({
      value: { confirmationStatus: 'confirmed', err: null },
    }),
    getSlot: vi.fn().mockResolvedValue(1000),
    commitment: 'confirmed' as Commitment,
    rpcEndpoint: 'http://localhost:8899',
  } as unknown as Connection;

  return connection;
};

export const createMockWallet = (publicKey?: PublicKey): anchor.Wallet => {
  const key = publicKey || new PublicKey('11111111111111111111111111111111');
  
  return {
    publicKey: key,
    signTransaction: vi.fn().mockImplementation((tx) => Promise.resolve(tx)),
    signAllTransactions: vi.fn().mockImplementation((txs) => Promise.resolve(txs)),
    payer: {
      publicKey: key,
      secretKey: new Uint8Array(64),
    } as any,
  } as anchor.Wallet;
};

export const createMockProvider = (
  connection?: Connection,
  wallet?: anchor.Wallet
): anchor.AnchorProvider => {
  const conn = connection || createMockConnection();
  const w = wallet || createMockWallet();
  
  return new anchor.AnchorProvider(conn, w, {
    commitment: 'confirmed',
    skipPreflight: false,
  });
};