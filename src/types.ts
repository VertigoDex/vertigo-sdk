import type { BN } from '@coral-xyz/anchor'
import type { PublicKey, Signer, VersionedTransaction } from '@solana/web3.js'

// ── Config ─────────────────────────────────────────────────

type VertigoConfig = {
  dflowApiKey?: string
  dflowApiUrl?: string
  programId?: PublicKey
}

// ── dFlow Swap ─────────────────────────────────────────────

type SwapArgs = {
  inputMint: PublicKey
  outputMint: PublicKey
  amount: BN | number
  user: PublicKey
  slippageBps?: number
}

type SwapResult = {
  transaction: VersionedTransaction
  expectedOutput: string
  minimumOutput: string
  priceImpact: string
}

type SwapStatusResult = {
  status: 'CLOSED' | 'PENDING_CLOSE' | 'OPEN_FAILED' | 'OPEN_EXPIRED'
  success: boolean
}

// ── Pool Operations ────────────────────────────────────────

type BuyArgs = {
  pool: PublicKey
  user: PublicKey
  owner: PublicKey
  mintA: PublicKey
  mintB: PublicKey
  userTaA: PublicKey
  userTaB: PublicKey
  vaultA?: PublicKey
  vaultB?: PublicKey
  amount: BN | number
  limit: BN | number
  tokenProgramA?: PublicKey
  tokenProgramB?: PublicKey
  signers?: Signer[]
}

type SellArgs = BuyArgs

type CreateArgs = {
  payer: PublicKey
  owner: PublicKey
  tokenWalletAuthority: PublicKey
  mintA: PublicKey
  mintB: PublicKey
  tokenWalletB: PublicKey
  pool?: PublicKey
  vaultA?: PublicKey
  vaultB?: PublicKey
  shift: BN | number
  initialTokenBReserves: BN | number
  feeParams: FeeParams
  tokenProgramA?: PublicKey
  tokenProgramB?: PublicKey
  signers?: Signer[]
}

type FeeParams = {
  normalizationPeriod: BN | number
  decay: number
  royaltiesBps: number
  privilegedSwapper?: PublicKey | null
  reference: BN | number
}

type ClaimArgs = {
  pool: PublicKey
  claimer: PublicKey
  mintA: PublicKey
  vaultA?: PublicKey
  receiverTaA: PublicKey
  tokenProgramA?: PublicKey
  signers?: Signer[]
}

type QuoteArgs = {
  pool: PublicKey
  owner: PublicKey
  user: PublicKey
  mintA: PublicKey
  mintB: PublicKey
  amount: BN | number
  limit: BN | number
}

type QuoteResult = {
  amountA: BN
  amountB: BN
  feeA: BN
}

type PoolData = {
  address: PublicKey
  owner: PublicKey
  mintA: PublicKey
  mintB: PublicKey
  tokenAReserves: BN
  tokenBReserves: BN
  shift: BN
  royalties: BN
  vertigoFees: BN
  enabled: boolean
  feeParams: {
    normalizationPeriod: BN
    decay: number
    royaltiesBps: number
    privilegedSwapper: PublicKey | null
    reference: BN
  }
}

export type {
  VertigoConfig,
  SwapArgs,
  SwapResult,
  SwapStatusResult,
  BuyArgs,
  SellArgs,
  CreateArgs,
  FeeParams,
  ClaimArgs,
  QuoteArgs,
  QuoteResult,
  PoolData,
}
