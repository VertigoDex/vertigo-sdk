import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Connection, PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { VertigoClient } from '../../../src/client/VertigoClient';
import { createMockConnection, createMockWallet } from '../../mocks/connection';
import { MOCK_PROGRAM_IDS, createMockProgram } from '../../mocks/programs';

// Mock anchor.Program
vi.mock('@coral-xyz/anchor', async () => {
  const actual = await vi.importActual('@coral-xyz/anchor');
  return {
    ...actual,
    Program: vi.fn().mockImplementation((idl, programId, provider) => {
      return createMockProgram(programId);
    }),
  };
});

// Mock the IDL loading
vi.mock('../../../target/idl/amm.json', () => ({
  default: {
    version: '0.1.0',
    name: 'amm',
    instructions: [],
    accounts: [],
  },
}));

vi.mock('../../../target/idl/pool_authority.json', () => ({
  default: {
    version: '0.1.0',
    name: 'pool_authority',
    instructions: [],
    accounts: [],
  },
}));

vi.mock('../../../target/idl/spl_token_factory.json', () => ({
  default: {
    version: '0.1.0',
    name: 'spl_token_factory',
    instructions: [],
    accounts: [],
  },
}));

vi.mock('../../../target/idl/token_2022_factory.json', () => ({
  default: {
    version: '0.1.0',
    name: 'token_2022_factory',
    instructions: [],
    accounts: [],
  },
}));

vi.mock('../../../target/idl/permissioned_relay.json', () => ({
  default: {
    version: '0.1.0',
    name: 'permissioned_relay',
    instructions: [],
    accounts: [],
  },
}));

describe('VertigoClient', () => {
  let mockConnection: Connection;
  
  beforeEach(() => {
    mockConnection = createMockConnection();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with connection only (read-only mode)', async () => {
      const client = await VertigoClient.loadReadOnly(mockConnection, 'mainnet');
      
      expect(client).toBeDefined();
      expect(client.connection).toBe(mockConnection);
      expect(client.network).toBe('mainnet');
      expect(client.isWalletConnected()).toBe(false);
    });

    it('should initialize with wallet', async () => {
      const wallet = createMockWallet();
      const client = await VertigoClient.load({
        connection: mockConnection,
        wallet,
        network: 'mainnet',
      });
      
      expect(client).toBeDefined();
      expect(client.connection).toBe(mockConnection);
      expect(client.wallet).toBe(wallet);
      expect(client.isWalletConnected()).toBe(true);
    });

    it('should initialize with custom configuration', async () => {
      const customApiUrl = 'https://custom-api.vertigo.so';
      const client = await VertigoClient.load({
        connection: mockConnection,
        network: 'devnet',
        apiUrl: customApiUrl,
        cache: {
          enabled: true,
          ttl: 30000,
        },
        priority: {
          autoFee: false,
          baseFee: 5000,
        },
      });
      
      expect(client).toBeDefined();
      expect(client.getApiUrl()).toBe(customApiUrl);
      expect(client.network).toBe('devnet');
      
      const config = client.getConfig();
      expect(config.cache.enabled).toBe(true);
      expect(config.cache.ttl).toBe(30000);
      expect(config.priority.autoFee).toBe(false);
      expect(config.priority.baseFee).toBe(5000);
    });

    it('should use default configuration when not specified', async () => {
      const client = await VertigoClient.load({
        connection: mockConnection,
        network: 'mainnet',
      });
      
      const config = client.getConfig();
      expect(config.commitment).toBe('confirmed');
      expect(config.skipPreflight).toBe(false);
      expect(config.cache.enabled).toBe(true);
      expect(config.priority.autoFee).toBe(true);
    });

    it('should initialize with custom program addresses', async () => {
      const customAmmAddress = new PublicKey('CJsLwbP1iu5DuUikHEJnLfANgKy6stB2uFgvBBHoyxwz');
      const client = await VertigoClient.load({
        connection: mockConnection,
        network: 'mainnet',
        programs: {
          amm: customAmmAddress,
        },
      });
      
      const addresses = client.getProgramAddresses();
      expect(addresses.amm.toBase58()).toBe(customAmmAddress.toBase58());
    });
  });

  describe('client modules', () => {
    it('should have all client modules initialized', async () => {
      const client = await VertigoClient.load({
        connection: mockConnection,
        network: 'mainnet',
      });
      
      expect(client.pools).toBeDefined();
      expect(client.swap).toBeDefined();
      expect(client.factory).toBeDefined();
      expect(client.relay).toBeDefined();
      expect(client.api).toBeDefined();
    });

    it('should properly initialize programs', async () => {
      const client = await VertigoClient.load({
        connection: mockConnection,
        network: 'mainnet',
      });
      
      expect(client.ammProgram).toBeDefined();
      expect(client.ammProgram.programId).toBeDefined();
    });
  });

  describe('network configuration', () => {
    it('should use mainnet configuration', async () => {
      const client = await VertigoClient.load({
        connection: mockConnection,
        network: 'mainnet',
      });
      
      expect(client.network).toBe('mainnet');
      expect(client.getApiUrl()).toBe('https://api.vertigo.so');
    });

    it('should use devnet configuration', async () => {
      const client = await VertigoClient.load({
        connection: mockConnection,
        network: 'devnet',
      });
      
      expect(client.network).toBe('devnet');
      expect(client.getApiUrl()).toBe('https://api-devnet.vertigo.so');
    });

    it('should use localnet configuration', async () => {
      const client = await VertigoClient.load({
        connection: mockConnection,
        network: 'localnet',
      });
      
      expect(client.network).toBe('localnet');
      expect(client.getApiUrl()).toBe('http://localhost:3000');
    });
  });

  describe('convenience methods', () => {
    it('should correctly check wallet connection status', async () => {
      const clientWithoutWallet = await VertigoClient.loadReadOnly(
        mockConnection,
        'mainnet'
      );
      expect(clientWithoutWallet.isWalletConnected()).toBe(false);
      
      const wallet = createMockWallet();
      const clientWithWallet = await VertigoClient.load({
        connection: mockConnection,
        wallet,
        network: 'mainnet',
      });
      expect(clientWithWallet.isWalletConnected()).toBe(true);
    });

    it('should return program addresses', async () => {
      const client = await VertigoClient.load({
        connection: mockConnection,
        network: 'mainnet',
      });
      
      const addresses = client.getProgramAddresses();
      expect(addresses.amm).toBeDefined();
      expect(addresses.poolAuthority).toBeDefined();
      expect(addresses.splTokenFactory).toBeDefined();
      expect(addresses.token2022Factory).toBeDefined();
      expect(addresses.permissionedRelay).toBeDefined();
    });
  });
});