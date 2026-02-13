import type { BN } from '@coral-xyz/anchor'
import type { PublicKey, Signer, VersionedTransaction } from '@solana/web3.js'

// ── Swap API Adapter ────────────────────────────────────────

type SwapRouteParams = {
  inputMint: string
  outputMint: string
  amount: string
  userPublicKey: string
  slippageBps: number
}

type SwapRouteResult = {
  transaction: string
  expectedOutput: string
  minimumOutput: string
  priceImpact: string
}

type SwapApi = {
  getSwapTransaction: (params: SwapRouteParams) => Promise<SwapRouteResult>
}

// ── Token API Adapter ───────────────────────────────────────

type TokenMetadata = {
  name: string
  symbol: string
  description: string
  image: string
  [key: string]: unknown
}

type PoolConfig = {
  shift: string
  initialTokenBReserves: string
  feeParams: {
    normalizationPeriod: string
    decay: number
    royaltiesBps: number
    privilegedSwapper?: string | null
    reference: string
  }
}

type CreateTokenParams = {
  payer: string
  metadata: TokenMetadata
  poolConfig: PoolConfig
}

type CreateTokenResult = {
  transaction: string
  mint: string
  pool: string
  metadataUri?: string
}

type GetTokenStatusParams = {
  mint: string
}

type TokenStatus = {
  status: 'pending' | 'indexed' | 'failed'
  indexed: boolean
  pool?: string
  error?: string
}

type TokenApi = {
  createToken: (params: CreateTokenParams) => Promise<CreateTokenResult>
  getTokenStatus: (params: GetTokenStatusParams) => Promise<TokenStatus>
}

// ── Config ─────────────────────────────────────────────────

type SwapOption =
  | { swapApi: SwapApi; swapApiKey?: never; swapApiUrl?: never }
  | { swapApi?: never; swapApiKey: string; swapApiUrl?: string }
  | { swapApi?: never; swapApiKey?: never; swapApiUrl?: never }

type TokenOption =
  | { tokenApi: TokenApi; tokenApiKey?: never; tokenApiUrl?: never }
  | { tokenApi?: never; tokenApiKey: string; tokenApiUrl?: string }
  | { tokenApi?: never; tokenApiKey?: never; tokenApiUrl?: never }

type VertigoConfig = { programId?: PublicKey } & SwapOption & TokenOption

// ── Swap (SDK-level) ────────────────────────────────────────

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
  SwapRouteParams,
  SwapRouteResult,
  SwapApi,
  TokenMetadata,
  PoolConfig,
  CreateTokenParams,
  CreateTokenResult,
  GetTokenStatusParams,
  TokenStatus,
  TokenApi,
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
