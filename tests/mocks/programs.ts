import { PublicKey } from '@solana/web3.js';
import { vi } from 'vitest';
import * as anchor from '@coral-xyz/anchor';

export const MOCK_PROGRAM_IDS = {
  AMM: new PublicKey('11111111111111111111111111111111'),
  POOL_AUTHORITY: new PublicKey('DjPi1LtwrXJMAh2AUvuUMajCpMJEKg8N1J8fU4L2Xr9D'),
  SPL_TOKEN_FACTORY: new PublicKey('EaYYJEmmLtwwnBJnscHdeHVEhUtgEN6B1PbLw6JUrH4x'),
  TOKEN_2022_FACTORY: new PublicKey('FZFRvStz5MtADm3SgPD7Pbiw3hmVSJDBD9DfXnrtYabY'),
  PERMISSIONED_RELAY: new PublicKey('GqnL1zHpKT9s8bdHdRTGPL9tai3W1YpntDUmccHfpjXB'),
};

export const MOCK_MINTS = {
  SOL: new PublicKey('So11111111111111111111111111111111111111112'),
  USDC: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
  CUSTOM_TOKEN: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
};

export const MOCK_POOLS = {
  SOL_USDC: new PublicKey('HWy1jotHpo6UqeQxx49dpYYdQB8wj9Qk9MdxwjLvDHB8'),
  SOL_CUSTOM: new PublicKey('JD3bq9hGdy38PuWQ4h2YJpELmHVGPPfFSuFkpzAd9zfu'),
};

export const createMockPoolAccount = (overrides?: Partial<any>) => ({
  owner: new PublicKey('KeccakSecp256k11111111111111111111111111111'),
  mintA: MOCK_MINTS.SOL,
  mintB: MOCK_MINTS.USDC,
  virtualReserveA: new anchor.BN(1000000000),
  virtualReserveB: new anchor.BN(1000000),
  feeParams: {
    royaltiesBps: 250,
    normalizationPeriod: new anchor.BN(3600),
    decay: 0.99,
    privilegedSwapper: null,
    reference: new anchor.BN(Date.now() / 1000),
  },
  ...overrides,
});

export const createMockProgram = <T>(programId: PublicKey): anchor.Program<T> => {
  return {
    programId,
    provider: createMockProvider(),
    account: {
      pool: {
        fetch: vi.fn().mockResolvedValue(createMockPoolAccount()),
        fetchMultiple: vi.fn().mockResolvedValue([
          createMockPoolAccount(),
          createMockPoolAccount({ mintB: MOCK_MINTS.CUSTOM_TOKEN }),
        ]),
        all: vi.fn().mockResolvedValue([
          {
            publicKey: MOCK_POOLS.SOL_USDC,
            account: createMockPoolAccount(),
          },
          {
            publicKey: MOCK_POOLS.SOL_CUSTOM,
            account: createMockPoolAccount({ mintB: MOCK_MINTS.CUSTOM_TOKEN }),
          },
        ]),
      },
    },
    methods: {
      create: vi.fn().mockReturnValue({
        accounts: vi.fn().mockReturnValue({
          instruction: vi.fn().mockResolvedValue({
            keys: [],
            programId,
            data: Buffer.from([]),
          }),
        }),
      }),
      quoteBuy: vi.fn().mockReturnValue({
        accounts: vi.fn().mockReturnValue({
          view: vi.fn().mockResolvedValue({
            amountB: new anchor.BN(990000),
            feeA: new anchor.BN(10000),
          }),
        }),
      }),
      quoteSell: vi.fn().mockReturnValue({
        accounts: vi.fn().mockReturnValue({
          view: vi.fn().mockResolvedValue({
            amountA: new anchor.BN(990000000),
            feeA: new anchor.BN(10000000),
          }),
        }),
      }),
      buy: vi.fn().mockReturnValue({
        accounts: vi.fn().mockReturnValue({
          instruction: vi.fn().mockResolvedValue({
            keys: [],
            programId,
            data: Buffer.from([]),
          }),
          transaction: vi.fn().mockResolvedValue({
            instructions: [],
            feePayer: null,
            signatures: [],
          }),
        }),
      }),
      sell: vi.fn().mockReturnValue({
        accounts: vi.fn().mockReturnValue({
          instruction: vi.fn().mockResolvedValue({
            keys: [],
            programId,
            data: Buffer.from([]),
          }),
          transaction: vi.fn().mockResolvedValue({
            instructions: [],
            feePayer: null,
            signatures: [],
          }),
        }),
      }),
      claim: vi.fn().mockReturnValue({
        accounts: vi.fn().mockReturnValue({
          transaction: vi.fn().mockResolvedValue({
            instructions: [],
            feePayer: null,
            signatures: [],
          }),
        }),
      }),
    },
  } as unknown as anchor.Program<T>;
};

// Helper to create mock provider
const createMockProvider = () => ({
  connection: {
    getBalance: vi.fn().mockResolvedValue(1000000000),
  },
  wallet: {
    publicKey: new PublicKey('11111111111111111111111111111111'),
  },
  sendAndConfirm: vi.fn().mockResolvedValue('mock-signature'),
});