import { AnchorProvider, BN, Program } from '@coral-xyz/anchor'
import type { Idl } from '@coral-xyz/anchor'
import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  VersionedTransaction,
} from '@solana/web3.js'
import type { TransactionInstruction } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'

import ammIdl from './idl/amm.json'
import { DFlowClient } from './dflow'
import type {
  BuyArgs,
  ClaimArgs,
  CreateArgs,
  PoolData,
  QuoteArgs,
  QuoteResult,
  SellArgs,
  SwapArgs,
  SwapResult,
  SwapStatusResult,
  VertigoConfig,
} from './types'

const POOL_SEED = 'pool'
const DEFAULT_PROGRAM_ID = new PublicKey('vrTGoBuy5rYSxAfV3jaRJWHH6nN9WK4NRExGxsk1bCJ')
const DEFAULT_SLIPPAGE_BPS = 50

const toBN = (value: BN | number): BN => {
  if (BN.isBN(value)) return value
  return new BN(value)
}

class VertigoClient {
  readonly provider: AnchorProvider
  readonly program: Program
  readonly programId: PublicKey
  private readonly dflow: DFlowClient

  constructor(
    provider: AnchorProvider,
    config: VertigoConfig = {},
  ) {
    this.provider = provider
    this.programId = config.programId ?? DEFAULT_PROGRAM_ID

    const idl = { ...ammIdl, address: this.programId.toBase58() } as Idl
    this.program = new Program(idl, provider)

    this.dflow = new DFlowClient({
      apiKey: config.dflowApiKey,
      apiUrl: config.dflowApiUrl,
    })
  }

  // ── PDA Helpers ──────────────────────────────────────────

  poolPda(owner: PublicKey, mintA: PublicKey, mintB: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(POOL_SEED), owner.toBuffer(), mintA.toBuffer(), mintB.toBuffer()],
      this.programId,
    )[0]
  }

  vaultPda(pool: PublicKey, mint: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
      [pool.toBuffer(), mint.toBuffer()],
      this.programId,
    )[0]
  }

  // ── Query ────────────────────────────────────────────────

  async getPool(pool: PublicKey): Promise<PoolData> {
    const accountInfo = await this.provider.connection.getAccountInfo(pool)
    if (!accountInfo) {
      throw new Error(`Pool not found: ${pool.toBase58()}`)
    }

    const decoded = this.program.coder.accounts.decode('pool', accountInfo.data)

    return {
      address: pool,
      owner: decoded.owner,
      mintA: decoded.mintA,
      mintB: decoded.mintB,
      tokenAReserves: new BN(decoded.tokenAReserves.toString()),
      tokenBReserves: new BN(decoded.tokenBReserves.toString()),
      shift: new BN(decoded.shift.toString()),
      royalties: new BN(decoded.royalties.toString()),
      vertigoFees: new BN(decoded.vertigoFees.toString()),
      enabled: decoded.enabled,
      feeParams: {
        normalizationPeriod: new BN(decoded.feeParams.normalizationPeriod.toString()),
        decay: decoded.feeParams.decay,
        royaltiesBps: decoded.feeParams.royaltiesBps,
        privilegedSwapper: decoded.feeParams.privilegedSwapper ?? null,
        reference: new BN(decoded.feeParams.reference.toString()),
      },
    }
  }

  // ── dFlow Swap ───────────────────────────────────────────

  async swap(args: SwapArgs): Promise<SwapResult> {
    const order = await this.dflow.getOrder({
      inputMint: args.inputMint.toBase58(),
      outputMint: args.outputMint.toBase58(),
      amount: toBN(args.amount).toString(),
      userPublicKey: args.user.toBase58(),
      slippageBps: args.slippageBps ?? DEFAULT_SLIPPAGE_BPS,
    })

    const txBytes = Buffer.from(order.transaction, 'base64')
    const transaction = VersionedTransaction.deserialize(txBytes)

    return {
      transaction,
      expectedOutput: order.outAmount,
      minimumOutput: order.otherAmountThreshold,
      priceImpact: order.priceImpactPct,
    }
  }

  async submitSwap(signedTx: VersionedTransaction): Promise<string> {
    return this.dflow.sendSignedTransaction(this.provider.connection, signedTx)
  }

  async swapStatus(signature: string): Promise<SwapStatusResult> {
    return this.dflow.getTransactionStatus(this.provider.connection, signature)
  }

  // ── Build Instructions ───────────────────────────────────

  async buildBuyIx(args: BuyArgs): Promise<TransactionInstruction> {
    const vaultA = args.vaultA ?? this.vaultPda(args.pool, args.mintA)
    const vaultB = args.vaultB ?? this.vaultPda(args.pool, args.mintB)

    return this.program.methods
      .buy({
        amount: toBN(args.amount),
        limit: toBN(args.limit),
      })
      .accounts({
        pool: args.pool,
        user: args.user,
        owner: args.owner,
        mintA: args.mintA,
        mintB: args.mintB,
        userTaA: args.userTaA,
        userTaB: args.userTaB,
        vaultA,
        vaultB,
        tokenProgramA: args.tokenProgramA ?? TOKEN_PROGRAM_ID,
        tokenProgramB: args.tokenProgramB ?? TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        program: this.programId,
      })
      .instruction()
  }

  async buildSellIx(args: SellArgs): Promise<TransactionInstruction> {
    const vaultA = args.vaultA ?? this.vaultPda(args.pool, args.mintA)
    const vaultB = args.vaultB ?? this.vaultPda(args.pool, args.mintB)

    return this.program.methods
      .sell({
        amount: toBN(args.amount),
        limit: toBN(args.limit),
      })
      .accounts({
        pool: args.pool,
        user: args.user,
        owner: args.owner,
        mintA: args.mintA,
        mintB: args.mintB,
        userTaA: args.userTaA,
        userTaB: args.userTaB,
        vaultA,
        vaultB,
        tokenProgramA: args.tokenProgramA ?? TOKEN_PROGRAM_ID,
        tokenProgramB: args.tokenProgramB ?? TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        program: this.programId,
      })
      .instruction()
  }

  async buildCreateIx(args: CreateArgs): Promise<TransactionInstruction> {
    const pool = args.pool ?? this.poolPda(args.owner, args.mintA, args.mintB)
    const vaultA = args.vaultA ?? this.vaultPda(pool, args.mintA)
    const vaultB = args.vaultB ?? this.vaultPda(pool, args.mintB)

    return this.program.methods
      .create({
        shift: toBN(args.shift),
        initialTokenBReserves: toBN(args.initialTokenBReserves),
        feeParams: {
          normalizationPeriod: toBN(args.feeParams.normalizationPeriod),
          decay: args.feeParams.decay,
          royaltiesBps: args.feeParams.royaltiesBps,
          privilegedSwapper: args.feeParams.privilegedSwapper ?? null,
          reference: toBN(args.feeParams.reference),
        },
      })
      .accounts({
        payer: args.payer,
        owner: args.owner,
        tokenWalletAuthority: args.tokenWalletAuthority,
        mintA: args.mintA,
        mintB: args.mintB,
        tokenWalletB: args.tokenWalletB,
        pool,
        vaultA,
        vaultB,
        tokenProgramA: args.tokenProgramA ?? TOKEN_PROGRAM_ID,
        tokenProgramB: args.tokenProgramB ?? TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .instruction()
  }

  async buildClaimIx(args: ClaimArgs): Promise<TransactionInstruction> {
    const vaultA = args.vaultA ?? this.vaultPda(args.pool, args.mintA)

    return this.program.methods
      .claim()
      .accounts({
        pool: args.pool,
        systemProgram: SystemProgram.programId,
        claimer: args.claimer,
        mintA: args.mintA,
        vaultA,
        receiverTaA: args.receiverTaA,
        tokenProgramA: args.tokenProgramA ?? TOKEN_PROGRAM_ID,
      })
      .instruction()
  }

  // ── Execute (build + send + confirm) ─────────────────────

  async buy(args: BuyArgs): Promise<string> {
    const ix = await this.buildBuyIx(args)
    const tx = new Transaction().add(ix)
    return this.provider.sendAndConfirm(tx, args.signers ?? [])
  }

  async sell(args: SellArgs): Promise<string> {
    const ix = await this.buildSellIx(args)
    const tx = new Transaction().add(ix)
    return this.provider.sendAndConfirm(tx, args.signers ?? [])
  }

  async create(args: CreateArgs): Promise<string> {
    const ix = await this.buildCreateIx(args)
    const tx = new Transaction().add(ix)
    return this.provider.sendAndConfirm(tx, args.signers ?? [])
  }

  async claim(args: ClaimArgs): Promise<string> {
    const ix = await this.buildClaimIx(args)
    const tx = new Transaction().add(ix)
    return this.provider.sendAndConfirm(tx, args.signers ?? [])
  }

  // ── Quote (read-only) ───────────────────────────────────

  async quoteBuy(args: QuoteArgs): Promise<QuoteResult> {
    const result = await this.program.methods
      .quoteBuy({
        amount: toBN(args.amount),
        limit: toBN(args.limit),
      })
      .accounts({
        pool: args.pool,
        owner: args.owner,
        user: args.user,
        mintA: args.mintA,
        mintB: args.mintB,
        program: this.programId,
      })
      .view()

    return {
      amountA: new BN(result.amountA.toString()),
      amountB: new BN(result.amountB.toString()),
      feeA: new BN(result.feeA.toString()),
    }
  }

  async quoteSell(args: QuoteArgs): Promise<QuoteResult> {
    const result = await this.program.methods
      .quoteSell({
        amount: toBN(args.amount),
        limit: toBN(args.limit),
      })
      .accounts({
        pool: args.pool,
        owner: args.owner,
        user: args.user,
        mintA: args.mintA,
        mintB: args.mintB,
        program: this.programId,
      })
      .view()

    return {
      amountA: new BN(result.amountA.toString()),
      amountB: new BN(result.amountB.toString()),
      feeA: new BN(result.feeA.toString()),
    }
  }
}

export { VertigoClient }
