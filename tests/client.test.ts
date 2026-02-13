import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  PublicKey,
  Keypair,
  Transaction,
  VersionedTransaction,
  MessageV0,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js'
import type { TransactionInstruction } from '@solana/web3.js'
import { AnchorProvider, BN } from '@coral-xyz/anchor'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { VertigoClient } from '../src/client'

const DEFAULT_PROGRAM_ID = new PublicKey('vrTGoBuy5rYSxAfV3jaRJWHH6nN9WK4NRExGxsk1bCJ')

const makeSerializableTx = (): VersionedTransaction => {
  const message = MessageV0.compile({
    payerKey: Keypair.generate().publicKey,
    instructions: [],
    recentBlockhash: 'GHtXQBsoZHVnNFa9YhR7UMFo9pehNRyGNKnMB1vN6oPh',
  })
  return new VersionedTransaction(message)
}

const makeMockProvider = () => {
  const wallet = {
    publicKey: Keypair.generate().publicKey,
    signTransaction: vi.fn(),
    signAllTransactions: vi.fn(),
  }

  const connection = {
    getAccountInfo: vi.fn(),
    sendRawTransaction: vi.fn(),
    getSignatureStatuses: vi.fn(),
    getLatestBlockhash: vi.fn().mockResolvedValue({
      blockhash: 'test-blockhash',
      lastValidBlockHeight: 100,
    }),
  }

  const provider = {
    connection,
    wallet,
    sendAndConfirm: vi.fn().mockResolvedValue('mock-tx-sig'),
  } as unknown as AnchorProvider

  return { provider, connection, wallet }
}

// Captures the args at each step of the Anchor method chain
const makeMockMethodChain = (resolvedValue: unknown = { programId: DEFAULT_PROGRAM_ID } as TransactionInstruction) => {
  const instructionFn = vi.fn().mockResolvedValue(resolvedValue)
  const viewFn = vi.fn().mockResolvedValue(resolvedValue)
  const accountsFn = vi.fn().mockReturnValue({ instruction: instructionFn, view: viewFn })
  const methodFn = vi.fn().mockReturnValue({ accounts: accountsFn })

  return { methodFn, accountsFn, instructionFn, viewFn }
}

// Generates a fixed set of keys for pool operation tests
const makePoolKeys = () => ({
  pool: Keypair.generate().publicKey,
  user: Keypair.generate().publicKey,
  owner: Keypair.generate().publicKey,
  mintA: Keypair.generate().publicKey,
  mintB: Keypair.generate().publicKey,
  userTaA: Keypair.generate().publicKey,
  userTaB: Keypair.generate().publicKey,
})

describe('VertigoClient', () => {
  describe('constructor', () => {
    it('creates client with default program ID', () => {
      const { provider } = makeMockProvider()
      const client = new VertigoClient(provider)

      expect(client.provider).toBe(provider)
      expect(client.programId.equals(DEFAULT_PROGRAM_ID)).toBe(true)
      expect(client.program).toBeDefined()
    })

    it('creates client with custom program ID', () => {
      const { provider } = makeMockProvider()
      const customProgramId = Keypair.generate().publicKey
      const client = new VertigoClient(provider, { programId: customProgramId })

      expect(client.programId.equals(customProgramId)).toBe(true)
    })
  })

  describe('PDA helpers', () => {
    let client: VertigoClient

    beforeEach(() => {
      const { provider } = makeMockProvider()
      client = new VertigoClient(provider)
    })

    it('pool PDA is deterministic', () => {
      const owner = Keypair.generate().publicKey
      const mintA = Keypair.generate().publicKey
      const mintB = Keypair.generate().publicKey

      const pda1 = client.poolPda(owner, mintA, mintB)
      const pda2 = client.poolPda(owner, mintA, mintB)

      expect(pda1.equals(pda2)).toBe(true)
    })

    it('different inputs produce different pool PDAs', () => {
      const owner = Keypair.generate().publicKey
      const mintA = Keypair.generate().publicKey
      const mintB = Keypair.generate().publicKey
      const mintC = Keypair.generate().publicKey

      expect(client.poolPda(owner, mintA, mintB).equals(client.poolPda(owner, mintA, mintC))).toBe(false)
    })

    it('pool PDA uses correct seeds', () => {
      const owner = Keypair.generate().publicKey
      const mintA = Keypair.generate().publicKey
      const mintB = Keypair.generate().publicKey

      const [expected] = PublicKey.findProgramAddressSync(
        [Buffer.from('pool'), owner.toBuffer(), mintA.toBuffer(), mintB.toBuffer()],
        DEFAULT_PROGRAM_ID,
      )

      expect(client.poolPda(owner, mintA, mintB).equals(expected)).toBe(true)
    })

    it('vault PDA is deterministic', () => {
      const pool = Keypair.generate().publicKey
      const mint = Keypair.generate().publicKey

      expect(client.vaultPda(pool, mint).equals(client.vaultPda(pool, mint))).toBe(true)
    })

    it('different mints produce different vault PDAs', () => {
      const pool = Keypair.generate().publicKey
      const mintA = Keypair.generate().publicKey
      const mintB = Keypair.generate().publicKey

      expect(client.vaultPda(pool, mintA).equals(client.vaultPda(pool, mintB))).toBe(false)
    })

    it('vault PDA uses correct seeds', () => {
      const pool = Keypair.generate().publicKey
      const mint = Keypair.generate().publicKey

      const [expected] = PublicKey.findProgramAddressSync(
        [pool.toBuffer(), mint.toBuffer()],
        DEFAULT_PROGRAM_ID,
      )

      expect(client.vaultPda(pool, mint).equals(expected)).toBe(true)
    })
  })

  describe('getPool', () => {
    it('throws when pool not found', async () => {
      const { provider, connection } = makeMockProvider()
      connection.getAccountInfo.mockResolvedValue(null)
      const client = new VertigoClient(provider)

      const poolKey = Keypair.generate().publicKey
      await expect(client.getPool(poolKey)).rejects.toThrow(`Pool not found: ${poolKey.toBase58()}`)
    })

    it('decodes pool account data on success', async () => {
      const { provider, connection } = makeMockProvider()
      const client = new VertigoClient(provider)

      const poolKey = Keypair.generate().publicKey
      const mockOwner = Keypair.generate().publicKey
      const mockMintA = Keypair.generate().publicKey
      const mockMintB = Keypair.generate().publicKey
      const mockPrivSwapper = Keypair.generate().publicKey

      const mockDecoded = {
        owner: mockOwner,
        mintA: mockMintA,
        mintB: mockMintB,
        tokenAReserves: new BN(5000),
        tokenBReserves: new BN(10000),
        shift: new BN(100),
        royalties: new BN(25),
        vertigoFees: new BN(10),
        enabled: true,
        feeParams: {
          normalizationPeriod: new BN(600),
          decay: 0.5,
          royaltiesBps: 250,
          privilegedSwapper: mockPrivSwapper,
          reference: new BN(42),
        },
      }

      connection.getAccountInfo.mockResolvedValue({ data: Buffer.alloc(0) })
      vi.spyOn(client.program.coder.accounts, 'decode').mockReturnValue(mockDecoded)

      const pool = await client.getPool(poolKey)

      expect(pool.address.equals(poolKey)).toBe(true)
      expect(pool.owner.equals(mockOwner)).toBe(true)
      expect(pool.mintA.equals(mockMintA)).toBe(true)
      expect(pool.mintB.equals(mockMintB)).toBe(true)
      expect(pool.tokenAReserves.eq(new BN(5000))).toBe(true)
      expect(pool.tokenBReserves.eq(new BN(10000))).toBe(true)
      expect(pool.shift.eq(new BN(100))).toBe(true)
      expect(pool.royalties.eq(new BN(25))).toBe(true)
      expect(pool.vertigoFees.eq(new BN(10))).toBe(true)
      expect(pool.enabled).toBe(true)
      expect(pool.feeParams.normalizationPeriod.eq(new BN(600))).toBe(true)
      expect(pool.feeParams.decay).toBe(0.5)
      expect(pool.feeParams.royaltiesBps).toBe(250)
      expect(pool.feeParams.privilegedSwapper?.equals(mockPrivSwapper)).toBe(true)
      expect(pool.feeParams.reference.eq(new BN(42))).toBe(true)
    })

    it('handles null privilegedSwapper', async () => {
      const { provider, connection } = makeMockProvider()
      const client = new VertigoClient(provider)

      connection.getAccountInfo.mockResolvedValue({ data: Buffer.alloc(0) })
      vi.spyOn(client.program.coder.accounts, 'decode').mockReturnValue({
        owner: Keypair.generate().publicKey,
        mintA: Keypair.generate().publicKey,
        mintB: Keypair.generate().publicKey,
        tokenAReserves: new BN(0),
        tokenBReserves: new BN(0),
        shift: new BN(0),
        royalties: new BN(0),
        vertigoFees: new BN(0),
        enabled: false,
        feeParams: {
          normalizationPeriod: new BN(0),
          decay: 0,
          royaltiesBps: 0,
          privilegedSwapper: null,
          reference: new BN(0),
        },
      })

      const pool = await client.getPool(Keypair.generate().publicKey)
      expect(pool.feeParams.privilegedSwapper).toBeNull()
    })
  })

  describe('buildBuyIx', () => {
    it('passes correct args and accounts to program', async () => {
      const { provider } = makeMockProvider()
      const client = new VertigoClient(provider)
      const keys = makePoolKeys()
      const mockIx = { programId: DEFAULT_PROGRAM_ID } as unknown as TransactionInstruction

      const chain = makeMockMethodChain(mockIx)
      ;(client.program as any).methods = { buy: chain.methodFn }

      const result = await client.buildBuyIx({
        ...keys,
        amount: 500,
        limit: 100,
      })

      expect(result).toBe(mockIx)

      // Verify buy was called with BN-normalized args
      const buyArgs = chain.methodFn.mock.calls[0][0]
      expect(BN.isBN(buyArgs.amount)).toBe(true)
      expect(buyArgs.amount.eq(new BN(500))).toBe(true)
      expect(buyArgs.limit.eq(new BN(100))).toBe(true)

      // Verify accounts
      const accounts = chain.accountsFn.mock.calls[0][0]
      expect(accounts.pool.equals(keys.pool)).toBe(true)
      expect(accounts.user.equals(keys.user)).toBe(true)
      expect(accounts.owner.equals(keys.owner)).toBe(true)
      expect(accounts.mintA.equals(keys.mintA)).toBe(true)
      expect(accounts.mintB.equals(keys.mintB)).toBe(true)
      expect(accounts.userTaA.equals(keys.userTaA)).toBe(true)
      expect(accounts.userTaB.equals(keys.userTaB)).toBe(true)
      expect(accounts.systemProgram.equals(SystemProgram.programId)).toBe(true)
      expect(accounts.program.equals(DEFAULT_PROGRAM_ID)).toBe(true)
    })

    it('auto-derives vault PDAs when not provided', async () => {
      const { provider } = makeMockProvider()
      const client = new VertigoClient(provider)
      const keys = makePoolKeys()

      const chain = makeMockMethodChain()
      ;(client.program as any).methods = { buy: chain.methodFn }

      await client.buildBuyIx({ ...keys, amount: 1, limit: 0 })

      const accounts = chain.accountsFn.mock.calls[0][0]
      const expectedVaultA = client.vaultPda(keys.pool, keys.mintA)
      const expectedVaultB = client.vaultPda(keys.pool, keys.mintB)
      expect(accounts.vaultA.equals(expectedVaultA)).toBe(true)
      expect(accounts.vaultB.equals(expectedVaultB)).toBe(true)
    })

    it('uses explicit vault PDAs when provided', async () => {
      const { provider } = makeMockProvider()
      const client = new VertigoClient(provider)
      const keys = makePoolKeys()
      const customVaultA = Keypair.generate().publicKey
      const customVaultB = Keypair.generate().publicKey

      const chain = makeMockMethodChain()
      ;(client.program as any).methods = { buy: chain.methodFn }

      await client.buildBuyIx({ ...keys, vaultA: customVaultA, vaultB: customVaultB, amount: 1, limit: 0 })

      const accounts = chain.accountsFn.mock.calls[0][0]
      expect(accounts.vaultA.equals(customVaultA)).toBe(true)
      expect(accounts.vaultB.equals(customVaultB)).toBe(true)
    })

    it('defaults to TOKEN_PROGRAM_ID when token programs not specified', async () => {
      const { provider } = makeMockProvider()
      const client = new VertigoClient(provider)
      const keys = makePoolKeys()

      const chain = makeMockMethodChain()
      ;(client.program as any).methods = { buy: chain.methodFn }

      await client.buildBuyIx({ ...keys, amount: 1, limit: 0 })

      const accounts = chain.accountsFn.mock.calls[0][0]
      expect(accounts.tokenProgramA.equals(TOKEN_PROGRAM_ID)).toBe(true)
      expect(accounts.tokenProgramB.equals(TOKEN_PROGRAM_ID)).toBe(true)
    })

    it('uses custom token programs when provided', async () => {
      const { provider } = makeMockProvider()
      const client = new VertigoClient(provider)
      const keys = makePoolKeys()
      const customTokenProgram = Keypair.generate().publicKey

      const chain = makeMockMethodChain()
      ;(client.program as any).methods = { buy: chain.methodFn }

      await client.buildBuyIx({
        ...keys,
        amount: 1,
        limit: 0,
        tokenProgramA: customTokenProgram,
        tokenProgramB: customTokenProgram,
      })

      const accounts = chain.accountsFn.mock.calls[0][0]
      expect(accounts.tokenProgramA.equals(customTokenProgram)).toBe(true)
      expect(accounts.tokenProgramB.equals(customTokenProgram)).toBe(true)
    })

    it('normalizes BN amount and limit', async () => {
      const { provider } = makeMockProvider()
      const client = new VertigoClient(provider)
      const keys = makePoolKeys()

      const chain = makeMockMethodChain()
      ;(client.program as any).methods = { buy: chain.methodFn }

      const bnAmount = new BN(999)
      const bnLimit = new BN(50)
      await client.buildBuyIx({ ...keys, amount: bnAmount, limit: bnLimit })

      const buyArgs = chain.methodFn.mock.calls[0][0]
      expect(buyArgs.amount).toBe(bnAmount)
      expect(buyArgs.limit).toBe(bnLimit)
    })
  })

  describe('buildSellIx', () => {
    it('calls program.methods.sell with correct args', async () => {
      const { provider } = makeMockProvider()
      const client = new VertigoClient(provider)
      const keys = makePoolKeys()

      const chain = makeMockMethodChain()
      ;(client.program as any).methods = { sell: chain.methodFn }

      await client.buildSellIx({ ...keys, amount: 300, limit: 50 })

      const sellArgs = chain.methodFn.mock.calls[0][0]
      expect(sellArgs.amount.eq(new BN(300))).toBe(true)
      expect(sellArgs.limit.eq(new BN(50))).toBe(true)

      const accounts = chain.accountsFn.mock.calls[0][0]
      expect(accounts.pool.equals(keys.pool)).toBe(true)
      expect(accounts.user.equals(keys.user)).toBe(true)
    })

    it('auto-derives vault PDAs', async () => {
      const { provider } = makeMockProvider()
      const client = new VertigoClient(provider)
      const keys = makePoolKeys()

      const chain = makeMockMethodChain()
      ;(client.program as any).methods = { sell: chain.methodFn }

      await client.buildSellIx({ ...keys, amount: 1, limit: 0 })

      const accounts = chain.accountsFn.mock.calls[0][0]
      expect(accounts.vaultA.equals(client.vaultPda(keys.pool, keys.mintA))).toBe(true)
      expect(accounts.vaultB.equals(client.vaultPda(keys.pool, keys.mintB))).toBe(true)
    })
  })

  describe('buildCreateIx', () => {
    const makeCreateArgs = () => {
      const keys = {
        payer: Keypair.generate().publicKey,
        owner: Keypair.generate().publicKey,
        tokenWalletAuthority: Keypair.generate().publicKey,
        mintA: Keypair.generate().publicKey,
        mintB: Keypair.generate().publicKey,
        tokenWalletB: Keypair.generate().publicKey,
      }
      return {
        ...keys,
        shift: 1_000_000,
        initialTokenBReserves: 1_000_000_000,
        feeParams: {
          normalizationPeriod: 600,
          decay: 0.5,
          royaltiesBps: 250,
          privilegedSwapper: null as PublicKey | null,
          reference: 0,
        },
      }
    }

    it('passes correctly normalized fee params to program', async () => {
      const { provider } = makeMockProvider()
      const client = new VertigoClient(provider)
      const args = makeCreateArgs()

      const chain = makeMockMethodChain()
      ;(client.program as any).methods = { create: chain.methodFn }

      await client.buildCreateIx(args)

      const createArgs = chain.methodFn.mock.calls[0][0]
      expect(BN.isBN(createArgs.shift)).toBe(true)
      expect(createArgs.shift.eq(new BN(1_000_000))).toBe(true)
      expect(createArgs.initialTokenBReserves.eq(new BN(1_000_000_000))).toBe(true)
      expect(BN.isBN(createArgs.feeParams.normalizationPeriod)).toBe(true)
      expect(createArgs.feeParams.normalizationPeriod.eq(new BN(600))).toBe(true)
      expect(createArgs.feeParams.decay).toBe(0.5)
      expect(createArgs.feeParams.royaltiesBps).toBe(250)
      expect(createArgs.feeParams.privilegedSwapper).toBeNull()
      expect(BN.isBN(createArgs.feeParams.reference)).toBe(true)
    })

    it('auto-derives pool and vault PDAs when not provided', async () => {
      const { provider } = makeMockProvider()
      const client = new VertigoClient(provider)
      const args = makeCreateArgs()

      const chain = makeMockMethodChain()
      ;(client.program as any).methods = { create: chain.methodFn }

      await client.buildCreateIx(args)

      const accounts = chain.accountsFn.mock.calls[0][0]
      const expectedPool = client.poolPda(args.owner, args.mintA, args.mintB)
      const expectedVaultA = client.vaultPda(expectedPool, args.mintA)
      const expectedVaultB = client.vaultPda(expectedPool, args.mintB)

      expect(accounts.pool.equals(expectedPool)).toBe(true)
      expect(accounts.vaultA.equals(expectedVaultA)).toBe(true)
      expect(accounts.vaultB.equals(expectedVaultB)).toBe(true)
    })

    it('uses explicit pool/vault addresses when provided', async () => {
      const { provider } = makeMockProvider()
      const client = new VertigoClient(provider)
      const args = makeCreateArgs()
      const customPool = Keypair.generate().publicKey
      const customVaultA = Keypair.generate().publicKey
      const customVaultB = Keypair.generate().publicKey

      const chain = makeMockMethodChain()
      ;(client.program as any).methods = { create: chain.methodFn }

      await client.buildCreateIx({
        ...args,
        pool: customPool,
        vaultA: customVaultA,
        vaultB: customVaultB,
      })

      const accounts = chain.accountsFn.mock.calls[0][0]
      expect(accounts.pool.equals(customPool)).toBe(true)
      expect(accounts.vaultA.equals(customVaultA)).toBe(true)
      expect(accounts.vaultB.equals(customVaultB)).toBe(true)
    })

    it('includes rent and system program in accounts', async () => {
      const { provider } = makeMockProvider()
      const client = new VertigoClient(provider)
      const args = makeCreateArgs()

      const chain = makeMockMethodChain()
      ;(client.program as any).methods = { create: chain.methodFn }

      await client.buildCreateIx(args)

      const accounts = chain.accountsFn.mock.calls[0][0]
      expect(accounts.rent.equals(SYSVAR_RENT_PUBKEY)).toBe(true)
      expect(accounts.systemProgram.equals(SystemProgram.programId)).toBe(true)
    })

    it('passes privilegedSwapper when set', async () => {
      const { provider } = makeMockProvider()
      const client = new VertigoClient(provider)
      const args = makeCreateArgs()
      const swapper = Keypair.generate().publicKey
      args.feeParams.privilegedSwapper = swapper

      const chain = makeMockMethodChain()
      ;(client.program as any).methods = { create: chain.methodFn }

      await client.buildCreateIx(args)

      const createArgs = chain.methodFn.mock.calls[0][0]
      expect(createArgs.feeParams.privilegedSwapper.equals(swapper)).toBe(true)
    })
  })

  describe('buildClaimIx', () => {
    it('passes correct accounts and auto-derives vault', async () => {
      const { provider } = makeMockProvider()
      const client = new VertigoClient(provider)
      const pool = Keypair.generate().publicKey
      const claimer = Keypair.generate().publicKey
      const mintA = Keypair.generate().publicKey
      const receiverTaA = Keypair.generate().publicKey

      const chain = makeMockMethodChain()
      ;(client.program as any).methods = { claim: chain.methodFn }

      await client.buildClaimIx({ pool, claimer, mintA, receiverTaA })

      // claim() is called with no args
      expect(chain.methodFn).toHaveBeenCalledWith()

      const accounts = chain.accountsFn.mock.calls[0][0]
      expect(accounts.pool.equals(pool)).toBe(true)
      expect(accounts.claimer.equals(claimer)).toBe(true)
      expect(accounts.mintA.equals(mintA)).toBe(true)
      expect(accounts.receiverTaA.equals(receiverTaA)).toBe(true)
      expect(accounts.vaultA.equals(client.vaultPda(pool, mintA))).toBe(true)
      expect(accounts.tokenProgramA.equals(TOKEN_PROGRAM_ID)).toBe(true)
      expect(accounts.systemProgram.equals(SystemProgram.programId)).toBe(true)
    })

    it('uses explicit vault when provided', async () => {
      const { provider } = makeMockProvider()
      const client = new VertigoClient(provider)
      const customVault = Keypair.generate().publicKey

      const chain = makeMockMethodChain()
      ;(client.program as any).methods = { claim: chain.methodFn }

      await client.buildClaimIx({
        pool: Keypair.generate().publicKey,
        claimer: Keypair.generate().publicKey,
        mintA: Keypair.generate().publicKey,
        receiverTaA: Keypair.generate().publicKey,
        vaultA: customVault,
      })

      const accounts = chain.accountsFn.mock.calls[0][0]
      expect(accounts.vaultA.equals(customVault)).toBe(true)
    })
  })

  describe('execute methods', () => {
    it('buy() builds instruction and sends transaction', async () => {
      const { provider } = makeMockProvider()
      const client = new VertigoClient(provider)
      const keys = makePoolKeys()
      const mockIx = { programId: DEFAULT_PROGRAM_ID, keys: [], data: Buffer.alloc(0) } as unknown as TransactionInstruction

      const chain = makeMockMethodChain(mockIx)
      ;(client.program as any).methods = { buy: chain.methodFn }

      const sig = await client.buy({ ...keys, amount: 100, limit: 0 })

      expect(sig).toBe('mock-tx-sig')
      expect(chain.instructionFn).toHaveBeenCalledOnce()
      expect((provider as any).sendAndConfirm).toHaveBeenCalledOnce()

      // Verify empty signers array when none provided
      const sendArgs = (provider as any).sendAndConfirm.mock.calls[0]
      expect(sendArgs[1]).toEqual([])
    })

    it('sell() builds instruction and sends transaction', async () => {
      const { provider } = makeMockProvider()
      const client = new VertigoClient(provider)
      const keys = makePoolKeys()
      const mockIx = { programId: DEFAULT_PROGRAM_ID, keys: [], data: Buffer.alloc(0) } as unknown as TransactionInstruction

      const chain = makeMockMethodChain(mockIx)
      ;(client.program as any).methods = { sell: chain.methodFn }

      const sig = await client.sell({ ...keys, amount: 100, limit: 0 })

      expect(sig).toBe('mock-tx-sig')
      expect(chain.instructionFn).toHaveBeenCalledOnce()
    })

    it('create() builds instruction and sends transaction', async () => {
      const { provider } = makeMockProvider()
      const client = new VertigoClient(provider)
      const mockIx = { programId: DEFAULT_PROGRAM_ID, keys: [], data: Buffer.alloc(0) } as unknown as TransactionInstruction

      const chain = makeMockMethodChain(mockIx)
      ;(client.program as any).methods = { create: chain.methodFn }

      const sig = await client.create({
        payer: Keypair.generate().publicKey,
        owner: Keypair.generate().publicKey,
        tokenWalletAuthority: Keypair.generate().publicKey,
        mintA: Keypair.generate().publicKey,
        mintB: Keypair.generate().publicKey,
        tokenWalletB: Keypair.generate().publicKey,
        shift: 100,
        initialTokenBReserves: 1000,
        feeParams: { normalizationPeriod: 600, decay: 0.5, royaltiesBps: 250, privilegedSwapper: null, reference: 0 },
      })

      expect(sig).toBe('mock-tx-sig')
    })

    it('claim() builds instruction and sends transaction', async () => {
      const { provider } = makeMockProvider()
      const client = new VertigoClient(provider)
      const mockIx = { programId: DEFAULT_PROGRAM_ID, keys: [], data: Buffer.alloc(0) } as unknown as TransactionInstruction

      const chain = makeMockMethodChain(mockIx)
      ;(client.program as any).methods = { claim: chain.methodFn }

      const sig = await client.claim({
        pool: Keypair.generate().publicKey,
        claimer: Keypair.generate().publicKey,
        mintA: Keypair.generate().publicKey,
        receiverTaA: Keypair.generate().publicKey,
      })

      expect(sig).toBe('mock-tx-sig')
    })

    it('buy() passes signers to sendAndConfirm', async () => {
      const { provider } = makeMockProvider()
      const client = new VertigoClient(provider)
      const keys = makePoolKeys()
      const mockIx = { programId: DEFAULT_PROGRAM_ID, keys: [], data: Buffer.alloc(0) } as unknown as TransactionInstruction
      const signer = Keypair.generate()

      const chain = makeMockMethodChain(mockIx)
      ;(client.program as any).methods = { buy: chain.methodFn }

      await client.buy({ ...keys, amount: 100, limit: 0, signers: [signer] })

      const sendArgs = (provider as any).sendAndConfirm.mock.calls[0]
      expect(sendArgs[1]).toEqual([signer])
    })
  })

  describe('quoteBuy', () => {
    it('calls program.methods.quoteBuy with correct args and returns QuoteResult', async () => {
      const { provider } = makeMockProvider()
      const client = new VertigoClient(provider)
      const keys = makePoolKeys()

      const mockViewResult = {
        amountA: new BN(1000),
        amountB: new BN(5000),
        feeA: new BN(10),
      }

      const chain = makeMockMethodChain(mockViewResult)
      ;(client.program as any).methods = { quoteBuy: chain.methodFn }

      const result = await client.quoteBuy({
        pool: keys.pool,
        owner: keys.owner,
        user: keys.user,
        mintA: keys.mintA,
        mintB: keys.mintB,
        amount: 1000,
        limit: 0,
      })

      // Verify .view() was called (not .instruction())
      expect(chain.viewFn).toHaveBeenCalledOnce()
      expect(chain.instructionFn).not.toHaveBeenCalled()

      // Verify args are BN-normalized
      const quoteArgs = chain.methodFn.mock.calls[0][0]
      expect(BN.isBN(quoteArgs.amount)).toBe(true)
      expect(quoteArgs.amount.eq(new BN(1000))).toBe(true)

      // Verify accounts include program
      const accounts = chain.accountsFn.mock.calls[0][0]
      expect(accounts.program.equals(DEFAULT_PROGRAM_ID)).toBe(true)
      expect(accounts.pool.equals(keys.pool)).toBe(true)

      // Verify result is properly mapped
      expect(result.amountA.eq(new BN(1000))).toBe(true)
      expect(result.amountB.eq(new BN(5000))).toBe(true)
      expect(result.feeA.eq(new BN(10))).toBe(true)
    })
  })

  describe('quoteSell', () => {
    it('calls program.methods.quoteSell and returns QuoteResult', async () => {
      const { provider } = makeMockProvider()
      const client = new VertigoClient(provider)
      const keys = makePoolKeys()

      const mockViewResult = {
        amountA: new BN(900),
        amountB: new BN(4500),
        feeA: new BN(8),
      }

      const chain = makeMockMethodChain(mockViewResult)
      ;(client.program as any).methods = { quoteSell: chain.methodFn }

      const result = await client.quoteSell({
        pool: keys.pool,
        owner: keys.owner,
        user: keys.user,
        mintA: keys.mintA,
        mintB: keys.mintB,
        amount: new BN(500),
        limit: new BN(10),
      })

      expect(chain.viewFn).toHaveBeenCalledOnce()
      expect(result.amountA.eq(new BN(900))).toBe(true)
      expect(result.amountB.eq(new BN(4500))).toBe(true)
      expect(result.feeA.eq(new BN(8))).toBe(true)

      // Verify BN passthrough (not re-wrapped when already BN)
      const quoteArgs = chain.methodFn.mock.calls[0][0]
      expect(quoteArgs.amount.eq(new BN(500))).toBe(true)
      expect(quoteArgs.limit.eq(new BN(10))).toBe(true)
    })
  })

  describe('swap', () => {
    it('calls dFlow and returns deserialized transaction', async () => {
      const { provider } = makeMockProvider()

      const mockTx = makeSerializableTx()
      const mockTxBase64 = Buffer.from(mockTx.serialize()).toString('base64')

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          transaction: mockTxBase64,
          inAmount: '1000000',
          outAmount: '500000',
          otherAmountThreshold: '475000',
          priceImpactPct: '0.5',
          lastValidBlockHeight: 100,
          executionMode: 'sync',
        }),
      } as any)

      const client = new VertigoClient(provider)
      const result = await client.swap({
        inputMint: Keypair.generate().publicKey,
        outputMint: Keypair.generate().publicKey,
        amount: 1_000_000,
        user: Keypair.generate().publicKey,
      })

      expect(result.transaction).toBeInstanceOf(VersionedTransaction)
      expect(result.expectedOutput).toBe('500000')
      expect(result.minimumOutput).toBe('475000')
      expect(result.priceImpact).toBe('0.5')

      vi.restoreAllMocks()
    })

    it('passes correct params to dFlow API including default slippage', async () => {
      const { provider } = makeMockProvider()
      const inputMint = Keypair.generate().publicKey
      const outputMint = Keypair.generate().publicKey
      const user = Keypair.generate().publicKey

      const mockTx = makeSerializableTx()
      const mockTxBase64 = Buffer.from(mockTx.serialize()).toString('base64')

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          transaction: mockTxBase64,
          inAmount: '1000',
          outAmount: '500',
          otherAmountThreshold: '475',
          priceImpactPct: '0',
          lastValidBlockHeight: 100,
          executionMode: 'sync',
        }),
      } as any)

      const client = new VertigoClient(provider)
      await client.swap({ inputMint, outputMint, amount: new BN(1000), user })

      const calledUrl = fetchSpy.mock.calls[0][0] as string
      expect(calledUrl).toContain(`inputMint=${inputMint.toBase58()}`)
      expect(calledUrl).toContain(`outputMint=${outputMint.toBase58()}`)
      expect(calledUrl).toContain('amount=1000')
      expect(calledUrl).toContain(`userPublicKey=${user.toBase58()}`)
      expect(calledUrl).toContain('slippageBps=50') // default

      vi.restoreAllMocks()
    })

    it('uses custom slippage when provided', async () => {
      const { provider } = makeMockProvider()

      const mockTx = makeSerializableTx()
      const mockTxBase64 = Buffer.from(mockTx.serialize()).toString('base64')

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          transaction: mockTxBase64,
          inAmount: '1',
          outAmount: '1',
          otherAmountThreshold: '1',
          priceImpactPct: '0',
          lastValidBlockHeight: 1,
          executionMode: 'sync',
        }),
      } as any)

      const client = new VertigoClient(provider)
      await client.swap({
        inputMint: Keypair.generate().publicKey,
        outputMint: Keypair.generate().publicKey,
        amount: 1,
        user: Keypair.generate().publicKey,
        slippageBps: 200,
      })

      const calledUrl = fetchSpy.mock.calls[0][0] as string
      expect(calledUrl).toContain('slippageBps=200')

      vi.restoreAllMocks()
    })
  })

  describe('submitSwap', () => {
    it('sends raw transaction via connection', async () => {
      const { provider, connection } = makeMockProvider()
      connection.sendRawTransaction.mockResolvedValue('submit-sig')
      const client = new VertigoClient(provider)

      const mockTx = makeSerializableTx()
      const sig = await client.submitSwap(mockTx)

      expect(sig).toBe('submit-sig')
      expect(connection.sendRawTransaction).toHaveBeenCalledOnce()
    })
  })

  describe('swapStatus', () => {
    it('returns CLOSED when confirmed', async () => {
      const { provider, connection } = makeMockProvider()
      connection.getSignatureStatuses.mockResolvedValue({
        value: [{ confirmationStatus: 'confirmed', err: null }],
      })

      const client = new VertigoClient(provider)
      const status = await client.swapStatus('test-sig')

      expect(status).toEqual({ status: 'CLOSED', success: true })
    })

    it('returns CLOSED when finalized', async () => {
      const { provider, connection } = makeMockProvider()
      connection.getSignatureStatuses.mockResolvedValue({
        value: [{ confirmationStatus: 'finalized', err: null }],
      })

      const client = new VertigoClient(provider)
      const status = await client.swapStatus('test-sig')

      expect(status).toEqual({ status: 'CLOSED', success: true })
    })

    it('returns OPEN_FAILED on tx error', async () => {
      const { provider, connection } = makeMockProvider()
      connection.getSignatureStatuses.mockResolvedValue({
        value: [{ confirmationStatus: 'confirmed', err: { InstructionError: [0, 'custom'] } }],
      })

      const client = new VertigoClient(provider)
      const status = await client.swapStatus('test-sig')

      expect(status).toEqual({ status: 'OPEN_FAILED', success: false })
    })

    it('returns PENDING_CLOSE when not found', async () => {
      const { provider, connection } = makeMockProvider()
      connection.getSignatureStatuses.mockResolvedValue({ value: [null] })

      const client = new VertigoClient(provider)
      const status = await client.swapStatus('test-sig')

      expect(status).toEqual({ status: 'PENDING_CLOSE', success: false })
    })

    it('returns PENDING_CLOSE when only processed', async () => {
      const { provider, connection } = makeMockProvider()
      connection.getSignatureStatuses.mockResolvedValue({
        value: [{ confirmationStatus: 'processed', err: null }],
      })

      const client = new VertigoClient(provider)
      const status = await client.swapStatus('test-sig')

      expect(status).toEqual({ status: 'PENDING_CLOSE', success: false })
    })
  })
})
