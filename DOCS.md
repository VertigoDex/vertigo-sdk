# Vertigo SDK — API Reference

Full reference for every method, type, and adapter in the SDK.

## Table of Contents

- [Configuration](#configuration)
- [VertigoClient](#vertigoclient)
  - [Constructor](#constructor)
  - [Swap Methods](#swap-methods)
  - [Token Creation Methods](#token-creation-methods)
  - [Pool Operations](#pool-operations)
  - [Build Instructions](#build-instructions)
  - [Quotes](#quotes)
  - [Pool Queries](#pool-queries)
  - [PDA Helpers](#pda-helpers)
- [Adapters](#adapters)
  - [SwapApi](#swapapi)
  - [TokenApi](#tokenapi)
- [Default Implementations](#default-implementations)
  - [createDFlowSwapApi](#createdflowswapapi)
  - [createDefaultTokenApi](#createdefaulttokenapi)
- [Backend Endpoint Specs](#backend-endpoint-specs)
- [Examples](#examples)
  - [End-to-End Swap Flow](#1-end-to-end-swap-flow)
  - [Token Launch Flow](#2-token-launch-flow)
  - [Pool Lifecycle](#3-pool-lifecycle)
  - [Quote-First Trading](#4-quote-first-trading)
  - [Custom Transaction Composition](#5-custom-transaction-composition)
  - [Custom Swap Adapter (Jupiter)](#6-custom-swap-adapter-jupiter)
  - [Custom Token Backend Adapter](#7-custom-token-backend-adapter)
  - [Pool Monitoring](#8-pool-monitoring)
  - [Error Handling Patterns](#9-error-handling-patterns)
- [Types](#types)

---

## Configuration

```ts
// Swap routing — provide a custom adapter OR credentials for the dFlow default (not both)
type SwapOption =
  | { swapApi: SwapApi; swapApiKey?: never; swapApiUrl?: never }
  | { swapApi?: never; swapApiKey: string; swapApiUrl?: string }
  | { swapApi?: never; swapApiKey?: never; swapApiUrl?: never }

// Token creation — provide a custom adapter OR credentials for the Vertigo default (not both)
type TokenOption =
  | { tokenApi: TokenApi; tokenApiKey?: never; tokenApiUrl?: never }
  | { tokenApi?: never; tokenApiKey: string; tokenApiUrl?: string }
  | { tokenApi?: never; tokenApiKey?: never; tokenApiUrl?: never }

type VertigoConfig = { programId?: PublicKey } & SwapOption & TokenOption
```

The union ensures you pass **either** a custom adapter **or** API credentials, never both. TypeScript will error if you try to mix them.

### Usage Examples

```ts
// Minimal — on-chain operations only (buy/sell/create/claim/quote)
const client = new VertigoClient(provider)

// With dFlow swap routing (default adapter)
const client = new VertigoClient(provider, {
  swapApiKey: 'DFLOW_KEY',
})

// With custom swap routing (Jupiter, own router, etc.)
const client = new VertigoClient(provider, {
  swapApi: myJupiterAdapter,
})

// With backend token creation (default adapter)
const client = new VertigoClient(provider, {
  tokenApiKey: 'VERTIGO_KEY',
})

// With custom token backend
const client = new VertigoClient(provider, {
  tokenApi: myCustomBackend,
})

// Full setup
const client = new VertigoClient(provider, {
  swapApiKey: 'DFLOW_KEY',
  tokenApiKey: 'VERTIGO_KEY',
})
```

### Config Resolution

**Swap routing** (pick one):

| Option | Fields | Behavior |
|--------|--------|----------|
| Custom adapter | `swapApi` | Your `SwapApi` implementation — used as-is |
| dFlow default | `swapApiKey`, `swapApiUrl?` | Creates a dFlow adapter with the given key |
| None | _(omit all)_ | `swap()` throws if called |

**Token creation** (pick one):

| Option | Fields | Behavior |
|--------|--------|----------|
| Custom adapter | `tokenApi` | Your `TokenApi` implementation — used as-is |
| Vertigo default | `tokenApiKey`, `tokenApiUrl?` | Creates the default Vertigo backend adapter |
| None | _(omit all)_ | `createToken()` / `getTokenStatus()` throw if called |

**Other:**

| Field | Behavior |
|-------|----------|
| `programId` | Custom Vertigo AMM program ID (default: `vrTGoBuy5rYSxAfV3jaRJWHH6nN9WK4NRExGxsk1bCJ`) |

---

## VertigoClient

### Constructor

```ts
new VertigoClient(provider: AnchorProvider, config?: VertigoConfig)
```

| Param | Type | Description |
|-------|------|-------------|
| `provider` | `AnchorProvider` | Anchor provider with connection and wallet |
| `config` | `VertigoConfig` | Optional configuration (adapters, program ID) |

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `provider` | `AnchorProvider` | The Anchor provider |
| `program` | `Program` | The Anchor program instance |
| `programId` | `PublicKey` | The Vertigo program ID |

---

### Swap Methods

#### `swap(args: SwapArgs): Promise<SwapResult>`

Gets an unsigned swap transaction from the configured `SwapApi` adapter.

**Throws** if no `swapApi` or `swapApiKey` is configured.

```ts
type SwapArgs = {
  inputMint: PublicKey
  outputMint: PublicKey
  amount: BN | number
  user: PublicKey
  slippageBps?: number        // default: 50 (0.5%)
}
```

**Returns:**

```ts
type SwapResult = {
  transaction: VersionedTransaction   // unsigned, ready to sign
  expectedOutput: string              // expected output amount
  minimumOutput: string               // minimum after slippage
  priceImpact: string                 // price impact percentage
}
```

**Example:**

```ts
const result = await client.swap({
  inputMint: SOL_MINT,
  outputMint: USDC_MINT,
  amount: 1_000_000_000,
  user: wallet.publicKey,
  slippageBps: 50,
})
```

---

#### `submitSwap(signedTx: VersionedTransaction): Promise<string>`

Submits a signed swap transaction to the network.

| Param | Type | Description |
|-------|------|-------------|
| `signedTx` | `VersionedTransaction` | The signed transaction from `swap()` |

**Returns:** Transaction signature (`string`).

---

#### `swapStatus(signature: string): Promise<SwapStatusResult>`

Checks the confirmation status of a submitted swap.

```ts
type SwapStatusResult = {
  status: 'CLOSED' | 'PENDING_CLOSE' | 'OPEN_FAILED' | 'OPEN_EXPIRED'
  success: boolean
}
```

| Status | Meaning |
|--------|---------|
| `CLOSED` | Transaction confirmed successfully |
| `PENDING_CLOSE` | Transaction not yet confirmed |
| `OPEN_FAILED` | Transaction failed (error on chain) |
| `OPEN_EXPIRED` | Transaction expired without confirmation |

---

### Token Creation Methods

#### `createToken(params: CreateTokenParams): Promise<{ transaction, mint, pool, metadataUri? }>`

Creates a token via the configured `TokenApi` adapter. The backend handles IPFS metadata upload, token indexing, and pre-mined addresses. Returns an unsigned transaction for the user to sign and submit.

**Throws** if no `tokenApi` or `tokenApiKey` is configured.

```ts
type CreateTokenParams = {
  payer: string                   // base58 public key
  metadata: TokenMetadata
  poolConfig: PoolConfig
}

type TokenMetadata = {
  name: string
  symbol: string
  description: string
  image: string                   // base64 data URI or URL
  [key: string]: unknown          // additional metadata fields
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
```

**Returns:**

```ts
{
  transaction: VersionedTransaction   // unsigned, ready to sign
  mint: PublicKey                      // the new token mint address
  pool: PublicKey                      // the new pool address
  metadataUri?: string                // IPFS/Arweave URI for metadata
}
```

**Example:**

```ts
const result = await client.createToken({
  payer: wallet.publicKey.toBase58(),
  metadata: {
    name: 'My Token',
    symbol: 'MTK',
    description: 'A cool token',
    image: 'data:image/png;base64,...',
  },
  poolConfig: {
    shift: '1000000',
    initialTokenBReserves: '1000000000',
    feeParams: {
      normalizationPeriod: '600',
      decay: 0.5,
      royaltiesBps: 250,
      privilegedSwapper: null,
      reference: '0',
    },
  },
})

// Sign and submit
result.transaction.sign([wallet.payer])
const signature = await provider.connection.sendRawTransaction(
  result.transaction.serialize()
)
```

---

#### `getTokenStatus(mint: PublicKey): Promise<TokenStatus>`

Checks whether a token has been indexed by the backend after creation.

**Throws** if no `tokenApi` or `tokenApiKey` is configured.

```ts
type TokenStatus = {
  status: 'pending' | 'indexed' | 'failed'
  indexed: boolean
  pool?: string               // base58 pool address (when indexed)
  error?: string              // error message (when failed)
}
```

**Example:**

```ts
const status = await client.getTokenStatus(result.mint)
if (status.indexed) {
  console.log('Token indexed, pool:', status.pool)
}
```

---

### Pool Operations

These methods build, send, and confirm transactions in a single call. They operate directly on-chain and do not require any adapter.

#### `create(args: CreateArgs): Promise<string>`

Creates a new liquidity pool.

```ts
type CreateArgs = {
  payer: PublicKey
  owner: PublicKey
  tokenWalletAuthority: PublicKey
  mintA: PublicKey
  mintB: PublicKey
  tokenWalletB: PublicKey
  pool?: PublicKey                   // auto-derived from PDA if omitted
  vaultA?: PublicKey                 // auto-derived from PDA if omitted
  vaultB?: PublicKey                 // auto-derived from PDA if omitted
  shift: BN | number
  initialTokenBReserves: BN | number
  feeParams: FeeParams
  tokenProgramA?: PublicKey          // default: TOKEN_PROGRAM_ID
  tokenProgramB?: PublicKey          // default: TOKEN_PROGRAM_ID
  signers?: Signer[]
}

type FeeParams = {
  normalizationPeriod: BN | number
  decay: number
  royaltiesBps: number
  privilegedSwapper?: PublicKey | null
  reference: BN | number
}
```

**Returns:** Transaction signature (`string`).

---

#### `buy(args: BuyArgs): Promise<string>`

Executes a buy (token B -> token A) against a pool.

```ts
type BuyArgs = {
  pool: PublicKey
  user: PublicKey
  owner: PublicKey
  mintA: PublicKey
  mintB: PublicKey
  userTaA: PublicKey                 // user's token account for mint A
  userTaB: PublicKey                 // user's token account for mint B
  vaultA?: PublicKey                 // auto-derived if omitted
  vaultB?: PublicKey                 // auto-derived if omitted
  amount: BN | number               // amount of token B to spend
  limit: BN | number                // minimum token A output (0 = no limit)
  tokenProgramA?: PublicKey          // default: TOKEN_PROGRAM_ID
  tokenProgramB?: PublicKey          // default: TOKEN_PROGRAM_ID
  signers?: Signer[]
}
```

**Returns:** Transaction signature (`string`).

---

#### `sell(args: SellArgs): Promise<string>`

Executes a sell (token A -> token B) against a pool. Takes the same args as `buy`.

```ts
type SellArgs = BuyArgs
```

**Returns:** Transaction signature (`string`).

---

#### `claim(args: ClaimArgs): Promise<string>`

Claims accumulated royalties from a pool.

```ts
type ClaimArgs = {
  pool: PublicKey
  claimer: PublicKey
  mintA: PublicKey
  vaultA?: PublicKey                 // auto-derived if omitted
  receiverTaA: PublicKey             // token account to receive royalties
  tokenProgramA?: PublicKey          // default: TOKEN_PROGRAM_ID
  signers?: Signer[]
}
```

**Returns:** Transaction signature (`string`).

---

### Build Instructions

These methods return raw `TransactionInstruction` objects for composing with other instructions or using custom signing flows. They take the same args as their corresponding pool operations.

| Method | Args | Returns |
|--------|------|---------|
| `buildBuyIx(args)` | `BuyArgs` | `Promise<TransactionInstruction>` |
| `buildSellIx(args)` | `SellArgs` | `Promise<TransactionInstruction>` |
| `buildCreateIx(args)` | `CreateArgs` | `Promise<TransactionInstruction>` |
| `buildClaimIx(args)` | `ClaimArgs` | `Promise<TransactionInstruction>` |

**Example — compose multiple instructions:**

```ts
import { Transaction, ComputeBudgetProgram } from '@solana/web3.js'

const buyIx = await client.buildBuyIx({ /* BuyArgs */ })

const tx = new Transaction()
  .add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50_000 }))
  .add(buyIx)

const signature = await provider.sendAndConfirm(tx, [])
```

---

### Quotes

Read-only methods that simulate a swap on-chain without executing it.

#### `quoteBuy(args: QuoteArgs): Promise<QuoteResult>`

#### `quoteSell(args: QuoteArgs): Promise<QuoteResult>`

```ts
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
  amountA: BN      // token A amount involved
  amountB: BN      // token B amount involved
  feeA: BN         // fee in token A
}
```

**Example:**

```ts
const quote = await client.quoteBuy({
  pool: poolAddress,
  owner: poolOwner,
  user: wallet.publicKey,
  mintA: SOL_MINT,
  mintB: TOKEN_MINT,
  amount: new BN(100_000_000),
  limit: new BN(0),
})

console.log('Tokens out:', quote.amountB.toString())
console.log('Fee:', quote.feeA.toString())
```

---

### Pool Queries

#### `getPool(pool: PublicKey): Promise<PoolData>`

Fetches and decodes a pool account from the chain.

**Throws** if the pool does not exist.

```ts
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
```

---

### PDA Helpers

Derive program addresses synchronously without RPC calls.

#### `poolPda(owner: PublicKey, mintA: PublicKey, mintB: PublicKey): PublicKey`

Seeds: `["pool", owner, mintA, mintB]`

#### `vaultPda(pool: PublicKey, mint: PublicKey): PublicKey`

Seeds: `[pool, mint]`

---

## Adapters

Both adapters use plain strings (not `PublicKey`/`BN`) because they cross HTTP boundaries.

### SwapApi

The swap routing contract. Any swap aggregator can implement this.

```ts
type SwapApi = {
  getSwapTransaction: (params: SwapRouteParams) => Promise<SwapRouteResult>
}

type SwapRouteParams = {
  inputMint: string          // base58 mint address
  outputMint: string         // base58 mint address
  amount: string             // amount in smallest units
  userPublicKey: string      // base58 user address
  slippageBps: number        // slippage tolerance in basis points
}

type SwapRouteResult = {
  transaction: string        // base64-encoded unsigned transaction
  expectedOutput: string     // expected output amount
  minimumOutput: string      // minimum output after slippage
  priceImpact: string        // price impact percentage
}
```

**Custom adapter example (Jupiter):**

```ts
const jupiterSwapApi: SwapApi = {
  getSwapTransaction: async (params) => {
    const quote = await fetch(`https://quote-api.jup.ag/v6/quote?...`)
    const swap = await fetch('https://quote-api.jup.ag/v6/swap', { ... })
    return {
      transaction: swap.swapTransaction,
      expectedOutput: quote.outAmount,
      minimumOutput: quote.otherAmountThreshold,
      priceImpact: quote.priceImpactPct,
    }
  },
}

const client = new VertigoClient(provider, { swapApi: jupiterSwapApi })
```

---

### TokenApi

The token creation contract. Any backend that handles metadata upload and token indexing can implement this.

```ts
type TokenApi = {
  createToken: (params: CreateTokenParams) => Promise<CreateTokenResult>
  getTokenStatus: (params: GetTokenStatusParams) => Promise<TokenStatus>
}

type CreateTokenParams = {
  payer: string              // base58 public key of the payer
  metadata: TokenMetadata
  poolConfig: PoolConfig
}

type CreateTokenResult = {
  transaction: string        // base64-encoded unsigned transaction
  mint: string               // base58 mint address
  pool: string               // base58 pool address
  metadataUri?: string       // IPFS/Arweave metadata URI
}

type GetTokenStatusParams = {
  mint: string               // base58 mint address
}

type TokenStatus = {
  status: 'pending' | 'indexed' | 'failed'
  indexed: boolean
  pool?: string
  error?: string
}
```

**Custom adapter example:**

```ts
const myTokenApi: TokenApi = {
  createToken: async (params) => {
    const resp = await fetch('https://my-backend.com/tokens', {
      method: 'POST',
      body: JSON.stringify(params),
    })
    return resp.json()
  },
  getTokenStatus: async (params) => {
    const resp = await fetch(`https://my-backend.com/tokens/${params.mint}/status`)
    return resp.json()
  },
}

const client = new VertigoClient(provider, { tokenApi: myTokenApi })
```

---

## Default Implementations

### createDFlowSwapApi

Factory that creates the default `SwapApi` using the dFlow aggregator.

```ts
import { createDFlowSwapApi } from '@vertigo-amm/vertigo-sdk'

const swapApi = createDFlowSwapApi({
  apiKey: 'your-dflow-key',   // optional — uses dev endpoint without it
  apiUrl: 'https://custom',   // optional — overrides auto URL selection
})
```

```ts
type DFlowSwapApiConfig = {
  apiKey?: string
  apiUrl?: string
}
```

| Config | URL Used |
|--------|----------|
| No `apiKey` | `https://dev-quote-api.dflow.net` |
| With `apiKey` | `https://d.quote-api.dflow.net` |
| With `apiUrl` | The custom URL |

**Timeout:** 10 seconds.

**dFlow response mapping:**

| dFlow field | SwapRouteResult field |
|-------------|----------------------|
| `outAmount` | `expectedOutput` |
| `otherAmountThreshold` | `minimumOutput` |
| `priceImpactPct` | `priceImpact` |
| `transaction` | `transaction` |

---

### createDefaultTokenApi

Factory that creates the default `TokenApi` pointing to the Vertigo backend.

```ts
import { createDefaultTokenApi } from '@vertigo-amm/vertigo-sdk'

const tokenApi = createDefaultTokenApi({
  apiKey: 'your-vertigo-key',           // required
  apiUrl: 'https://custom-backend',     // optional, default: https://api.vertigo.so
})
```

```ts
type TokenApiConfig = {
  apiKey: string
  apiUrl?: string      // default: https://api.vertigo.so
}
```

**Timeout:** 30 seconds (longer due to IPFS upload on the backend).

---

## Backend Endpoint Specs

These are the HTTP endpoints that the default adapters call. If you're building a custom backend, implement these contracts.

### Token API Endpoints

#### `POST /v1/tokens` — Create a token

**Headers:**

| Header | Value |
|--------|-------|
| `Content-Type` | `application/json` |
| `x-api-key` | Your API key |

**Request body:**

```json
{
  "payer": "BASE58_PUBKEY",
  "metadata": {
    "name": "My Token",
    "symbol": "MTK",
    "description": "A cool token",
    "image": "data:image/png;base64,..."
  },
  "poolConfig": {
    "shift": "1000000",
    "initialTokenBReserves": "1000000000",
    "feeParams": {
      "normalizationPeriod": "600",
      "decay": 0.5,
      "royaltiesBps": 250,
      "privilegedSwapper": null,
      "reference": "0"
    }
  }
}
```

**Response `200`:**

```json
{
  "transaction": "BASE64_UNSIGNED_TX",
  "mint": "BASE58_MINT",
  "pool": "BASE58_POOL",
  "metadataUri": "https://arweave.net/..."
}
```

---

#### `GET /v1/tokens/:mint/status` — Check token indexing status

**Headers:**

| Header | Value |
|--------|-------|
| `x-api-key` | Your API key |

**Response `200`:**

```json
{
  "status": "pending | indexed | failed",
  "indexed": true,
  "pool": "BASE58_POOL",
  "error": "..."
}
```

---

### Swap API Endpoints (dFlow)

#### `GET /order` — Get swap transaction

**Headers:**

| Header | Value |
|--------|-------|
| `Content-Type` | `application/json` |
| `x-api-key` | Your API key (optional for dev) |

**Query params:**

| Param | Type | Description |
|-------|------|-------------|
| `inputMint` | `string` | Base58 input mint address |
| `outputMint` | `string` | Base58 output mint address |
| `amount` | `string` | Amount in smallest units |
| `userPublicKey` | `string` | Base58 user address |
| `slippageBps` | `string` | Slippage tolerance in basis points |

**Response `200`:**

```json
{
  "transaction": "BASE64_UNSIGNED_TX",
  "outAmount": "500000",
  "otherAmountThreshold": "475000",
  "priceImpactPct": "0.5"
}
```

---

## Examples

End-to-end examples showing real-world usage patterns.

### Shared Setup

All examples below assume this setup:

```ts
import { AnchorProvider, BN, Wallet } from '@coral-xyz/anchor'
import { Connection, Keypair, PublicKey } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token'
import { VertigoClient } from '@vertigo-amm/vertigo-sdk'

const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed')
const wallet = new Wallet(Keypair.fromSecretKey(/* your key */))
const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' })
```

---

### 1. End-to-End Swap Flow

Get a swap transaction, sign it, submit it, and poll until confirmed.

```ts
const client = new VertigoClient(provider, { swapApiKey: 'YOUR_DFLOW_KEY' })

const SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112')
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')

// 1. Get unsigned swap transaction (1 SOL → USDC, 0.5% slippage)
const { transaction, expectedOutput, priceImpact } = await client.swap({
  inputMint: SOL_MINT,
  outputMint: USDC_MINT,
  amount: 1_000_000_000,
  user: wallet.publicKey,
  slippageBps: 50,
})

console.log(`Expected output: ${expectedOutput} USDC`)
console.log(`Price impact: ${priceImpact}%`)

// 2. Sign and submit
transaction.sign([wallet.payer])
const signature = await client.submitSwap(transaction)
console.log(`Submitted: ${signature}`)

// 3. Poll status until confirmed
const poll = async (): Promise<void> => {
  const { status, success } = await client.swapStatus(signature)

  if (status === 'CLOSED') {
    console.log('Swap confirmed!')
    return
  }

  if (status === 'OPEN_FAILED') {
    throw new Error('Swap failed on-chain')
  }

  // Still pending — wait and retry
  await new Promise((resolve) => setTimeout(resolve, 2_000))
  return poll()
}

await poll()
```

---

### 2. Token Launch Flow

Create a token via the backend, sign the transaction, and poll until indexed.

```ts
const client = new VertigoClient(provider, { tokenApiKey: 'YOUR_VERTIGO_KEY' })

// 1. Create token (backend handles metadata upload + indexing)
const { transaction, mint, pool, metadataUri } = await client.createToken({
  payer: wallet.publicKey.toBase58(),
  metadata: {
    name: 'Awesome Token',
    symbol: 'AWE',
    description: 'The most awesome token on Solana',
    image: 'data:image/png;base64,iVBORw0KGgo...',
  },
  poolConfig: {
    shift: '1000000',
    initialTokenBReserves: '1000000000',
    feeParams: {
      normalizationPeriod: '600',
      decay: 0.5,
      royaltiesBps: 250,
      privilegedSwapper: null,
      reference: '0',
    },
  },
})

console.log(`Mint: ${mint.toBase58()}`)
console.log(`Pool: ${pool.toBase58()}`)
console.log(`Metadata: ${metadataUri}`)

// 2. Sign and submit
transaction.sign([wallet.payer])
const signature = await provider.connection.sendRawTransaction(transaction.serialize())
console.log(`Submitted: ${signature}`)

// 3. Poll until the token is indexed by the backend
const waitForIndexing = async (): Promise<void> => {
  const status = await client.getTokenStatus(mint)

  if (status.indexed) {
    console.log(`Token indexed! Pool: ${status.pool}`)
    return
  }

  if (status.status === 'failed') {
    throw new Error(`Indexing failed: ${status.error}`)
  }

  await new Promise((resolve) => setTimeout(resolve, 3_000))
  return waitForIndexing()
}

await waitForIndexing()
```

---

### 3. Pool Lifecycle

Create a pool, trade on it, inspect state, and claim royalties.

```ts
const client = new VertigoClient(provider)

const MINT_A = new PublicKey('So11111111111111111111111111111111111111112')  // SOL
const MINT_B = new PublicKey('YOUR_TOKEN_MINT')

const owner = wallet.publicKey
const poolAddress = client.poolPda(owner, MINT_A, MINT_B)

// ── Step 1: Create pool ─────────────────────────────────
const tokenWalletB = getAssociatedTokenAddressSync(MINT_B, owner)

const createSig = await client.create({
  payer: wallet.publicKey,
  owner,
  tokenWalletAuthority: owner,
  mintA: MINT_A,
  mintB: MINT_B,
  tokenWalletB,
  shift: 1_000_000,
  initialTokenBReserves: 1_000_000_000,
  feeParams: {
    normalizationPeriod: 600,
    decay: 0.5,
    royaltiesBps: 250,
    privilegedSwapper: null,
    reference: 0,
  },
})

console.log(`Pool created: ${createSig}`)

// ── Step 2: Buy tokens (SOL → Token) ────────────────────
const userTaA = getAssociatedTokenAddressSync(MINT_A, wallet.publicKey)
const userTaB = getAssociatedTokenAddressSync(MINT_B, wallet.publicKey)

const buySig = await client.buy({
  pool: poolAddress,
  user: wallet.publicKey,
  owner,
  mintA: MINT_A,
  mintB: MINT_B,
  userTaA,
  userTaB,
  amount: 100_000_000,   // 0.1 SOL
  limit: 0,              // no minimum output
})

console.log(`Buy executed: ${buySig}`)

// ── Step 3: Check pool state ─────────────────────────────
const pool = await client.getPool(poolAddress)
console.log(`Reserves A: ${pool.tokenAReserves.toString()}`)
console.log(`Reserves B: ${pool.tokenBReserves.toString()}`)
console.log(`Royalties accrued: ${pool.royalties.toString()}`)
console.log(`Pool enabled: ${pool.enabled}`)

// ── Step 4: Sell tokens (Token → SOL) ────────────────────
const sellSig = await client.sell({
  pool: poolAddress,
  user: wallet.publicKey,
  owner,
  mintA: MINT_A,
  mintB: MINT_B,
  userTaA,
  userTaB,
  amount: 50_000_000,
  limit: 0,
})

console.log(`Sell executed: ${sellSig}`)

// ── Step 5: Claim royalties ──────────────────────────────
const receiverTaA = getAssociatedTokenAddressSync(MINT_A, wallet.publicKey)

const claimSig = await client.claim({
  pool: poolAddress,
  claimer: wallet.publicKey,
  mintA: MINT_A,
  receiverTaA,
})

console.log(`Royalties claimed: ${claimSig}`)
```

---

### 4. Quote-First Trading

Get quotes before executing to display expected outcomes to the user.

```ts
const client = new VertigoClient(provider)

const poolAddress = new PublicKey('POOL_ADDRESS')
const pool = await client.getPool(poolAddress)

const tradeAmount = new BN(500_000_000)  // 0.5 SOL

// Get buy quote (SOL → Token)
const buyQuote = await client.quoteBuy({
  pool: poolAddress,
  owner: pool.owner,
  user: wallet.publicKey,
  mintA: pool.mintA,
  mintB: pool.mintB,
  amount: tradeAmount,
  limit: new BN(0),
})

console.log(`Buy ${tradeAmount.toString()} of token B:`)
console.log(`  You receive: ${buyQuote.amountA.toString()} token A`)
console.log(`  Fee: ${buyQuote.feeA.toString()} token A`)

// Get sell quote for comparison
const sellQuote = await client.quoteSell({
  pool: poolAddress,
  owner: pool.owner,
  user: wallet.publicKey,
  mintA: pool.mintA,
  mintB: pool.mintB,
  amount: tradeAmount,
  limit: new BN(0),
})

console.log(`Sell ${tradeAmount.toString()} of token A:`)
console.log(`  You receive: ${sellQuote.amountB.toString()} token B`)
console.log(`  Fee: ${sellQuote.feeA.toString()} token A`)

// Only execute if the quote is acceptable
const minimumOutput = new BN(400_000_000)

if (buyQuote.amountA.gte(minimumOutput)) {
  await client.buy({
    pool: poolAddress,
    user: wallet.publicKey,
    owner: pool.owner,
    mintA: pool.mintA,
    mintB: pool.mintB,
    userTaA: getAssociatedTokenAddressSync(pool.mintA, wallet.publicKey),
    userTaB: getAssociatedTokenAddressSync(pool.mintB, wallet.publicKey),
    amount: tradeAmount,
    limit: minimumOutput,  // enforce slippage protection
  })
}
```

---

### 5. Custom Transaction Composition

Build raw instructions and combine them with compute budget, priority fees, or other instructions.

```ts
import { Transaction, ComputeBudgetProgram } from '@solana/web3.js'

const client = new VertigoClient(provider)

const poolAddress = new PublicKey('POOL_ADDRESS')
const pool = await client.getPool(poolAddress)

// Build buy instruction (does not send anything)
const buyIx = await client.buildBuyIx({
  pool: poolAddress,
  user: wallet.publicKey,
  owner: pool.owner,
  mintA: pool.mintA,
  mintB: pool.mintB,
  userTaA: getAssociatedTokenAddressSync(pool.mintA, wallet.publicKey),
  userTaB: getAssociatedTokenAddressSync(pool.mintB, wallet.publicKey),
  amount: 100_000_000,
  limit: 0,
})

// Compose a transaction with priority fees
const tx = new Transaction()
  .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }))
  .add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50_000 }))
  .add(buyIx)

const signature = await provider.sendAndConfirm(tx, [])
console.log(`Executed with priority fees: ${signature}`)
```

**Batch buy + sell in one transaction:**

```ts
const buyIx = await client.buildBuyIx({
  pool: poolA,
  user: wallet.publicKey,
  owner: ownerA,
  mintA: mintA1,
  mintB: mintB1,
  userTaA: userTaA1,
  userTaB: userTaB1,
  amount: 100_000_000,
  limit: 0,
})

const sellIx = await client.buildSellIx({
  pool: poolB,
  user: wallet.publicKey,
  owner: ownerB,
  mintA: mintA2,
  mintB: mintB2,
  userTaA: userTaA2,
  userTaB: userTaB2,
  amount: 50_000_000,
  limit: 0,
})

const tx = new Transaction().add(buyIx).add(sellIx)
const signature = await provider.sendAndConfirm(tx, [])
```

---

### 6. Custom Swap Adapter (Jupiter)

Implement a `SwapApi` adapter wrapping Jupiter's API.

```ts
import type { SwapApi, SwapRouteParams, SwapRouteResult } from '@vertigo-amm/vertigo-sdk'

const createJupiterSwapApi = (): SwapApi => {
  const getSwapTransaction = async (params: SwapRouteParams): Promise<SwapRouteResult> => {
    // 1. Get quote
    const quoteParams = new URLSearchParams({
      inputMint: params.inputMint,
      outputMint: params.outputMint,
      amount: params.amount,
      slippageBps: params.slippageBps.toString(),
    })

    const quoteResp = await fetch(
      `https://quote-api.jup.ag/v6/quote?${quoteParams.toString()}`,
    )
    const quote = await quoteResp.json()

    // 2. Get swap transaction
    const swapResp = await fetch('https://quote-api.jup.ag/v6/swap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteResponse: quote,
        userPublicKey: params.userPublicKey,
        wrapAndUnwrapSol: true,
      }),
    })
    const swap = await swapResp.json()

    return {
      transaction: swap.swapTransaction,
      expectedOutput: quote.outAmount,
      minimumOutput: quote.otherAmountThreshold,
      priceImpact: quote.priceImpactPct,
    }
  }

  return { getSwapTransaction }
}

// Use it
const client = new VertigoClient(provider, {
  swapApi: createJupiterSwapApi(),
})

const result = await client.swap({
  inputMint: SOL_MINT,
  outputMint: USDC_MINT,
  amount: 1_000_000_000,
  user: wallet.publicKey,
})
```

---

### 7. Custom Token Backend Adapter

Implement a `TokenApi` adapter for your own token creation backend.

```ts
import type { TokenApi, CreateTokenParams, CreateTokenResult, GetTokenStatusParams, TokenStatus } from '@vertigo-amm/vertigo-sdk'

const createMyTokenApi = (apiUrl: string, apiKey: string): TokenApi => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  }

  const createToken = async (params: CreateTokenParams): Promise<CreateTokenResult> => {
    const response = await fetch(`${apiUrl}/tokens`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        payer: params.payer,
        name: params.metadata.name,
        symbol: params.metadata.symbol,
        description: params.metadata.description,
        imageBase64: params.metadata.image,
        poolShift: params.poolConfig.shift,
        poolReserves: params.poolConfig.initialTokenBReserves,
        feeConfig: params.poolConfig.feeParams,
      }),
    })

    if (!response.ok) {
      throw new Error(`Token creation failed: ${response.status}`)
    }

    const data = await response.json()

    // Map your backend's response to the SDK's expected format
    return {
      transaction: data.unsignedTx,
      mint: data.mintAddress,
      pool: data.poolAddress,
      metadataUri: data.arweaveUri,
    }
  }

  const getTokenStatus = async (params: GetTokenStatusParams): Promise<TokenStatus> => {
    const response = await fetch(`${apiUrl}/tokens/${params.mint}`, { headers })
    const data = await response.json()

    return {
      status: data.state,
      indexed: data.state === 'indexed',
      pool: data.poolAddress,
      error: data.errorMessage,
    }
  }

  return { createToken, getTokenStatus }
}

// Use it
const client = new VertigoClient(provider, {
  tokenApi: createMyTokenApi('https://api.myapp.com', 'my-key'),
})
```

---

### 8. Pool Monitoring

Fetch and display pool data for a dashboard or monitoring tool.

```ts
const client = new VertigoClient(provider)

const monitorPool = async (poolAddress: PublicKey): Promise<void> => {
  const pool = await client.getPool(poolAddress)

  console.log('── Pool Info ──────────────────────────')
  console.log(`Address:      ${pool.address.toBase58()}`)
  console.log(`Owner:        ${pool.owner.toBase58()}`)
  console.log(`Mint A:       ${pool.mintA.toBase58()}`)
  console.log(`Mint B:       ${pool.mintB.toBase58()}`)
  console.log(`Enabled:      ${pool.enabled}`)
  console.log('')
  console.log('── Reserves ───────────────────────────')
  console.log(`Token A:      ${pool.tokenAReserves.toString()}`)
  console.log(`Token B:      ${pool.tokenBReserves.toString()}`)
  console.log(`Shift:        ${pool.shift.toString()}`)
  console.log('')
  console.log('── Fees ───────────────────────────────')
  console.log(`Royalties:    ${pool.royalties.toString()}`)
  console.log(`Vertigo fees: ${pool.vertigoFees.toString()}`)
  console.log(`Royalty BPS:  ${pool.feeParams.royaltiesBps}`)
  console.log(`Decay:        ${pool.feeParams.decay}`)
  console.log(`Norm period:  ${pool.feeParams.normalizationPeriod.toString()}`)
}

// Monitor multiple pools
const pools = [
  new PublicKey('POOL_1'),
  new PublicKey('POOL_2'),
]

const results = await Promise.allSettled(pools.map(monitorPool))

for (const [i, result] of results.entries()) {
  if (result.status === 'rejected') {
    console.error(`Pool ${pools[i].toBase58()}: ${result.reason}`)
  }
}
```

---

### 9. Error Handling Patterns

Graceful handling of common error scenarios.

```ts
const client = new VertigoClient(provider, {
  swapApiKey: 'YOUR_DFLOW_KEY',
  tokenApiKey: 'YOUR_VERTIGO_KEY',
})

// ── Handle pool not found ────────────────────────────────
const safeGetPool = async (poolAddress: PublicKey): Promise<PoolData | null> => {
  try {
    return await client.getPool(poolAddress)
  } catch (error) {
    if (error instanceof Error && error.message.includes('Pool not found')) {
      return null
    }
    throw error
  }
}

const pool = await safeGetPool(new PublicKey('MAYBE_INVALID'))

if (!pool) {
  console.log('Pool does not exist')
}

// ── Handle swap with timeout / failure ───────────────────
const swapWithRetry = async (
  maxAttempts: number,
): Promise<string> => {
  const { transaction } = await client.swap({
    inputMint: SOL_MINT,
    outputMint: TOKEN_MINT,
    amount: 1_000_000_000,
    user: wallet.publicKey,
  })

  transaction.sign([wallet.payer])

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const signature = await client.submitSwap(transaction)
      const { status } = await client.swapStatus(signature)

      if (status === 'CLOSED') return signature
      if (status === 'OPEN_FAILED') throw new Error('Swap failed on-chain')

      // PENDING_CLOSE — wait and check again
      await new Promise((resolve) => setTimeout(resolve, 2_000))
      const recheck = await client.swapStatus(signature)

      if (recheck.status === 'CLOSED') return signature
    } catch (error) {
      if (attempt === maxAttempts) throw error
      console.log(`Attempt ${attempt} failed, retrying...`)
    }
  }

  throw new Error('Swap did not confirm after max attempts')
}

// ── Handle missing adapter gracefully ────────────────────
const clientOnChainOnly = new VertigoClient(provider) // no adapters

try {
  await clientOnChainOnly.swap({
    inputMint: SOL_MINT,
    outputMint: TOKEN_MINT,
    amount: 1_000_000_000,
    user: wallet.publicKey,
  })
} catch (error) {
  // "Swap API not configured. Provide swapApi or swapApiKey in VertigoConfig."
  console.log('Expected error:', (error as Error).message)
}
```

---

## Types

All types are exported from the package root:

```ts
import type {
  // Adapter contracts
  SwapApi,
  SwapRouteParams,
  SwapRouteResult,
  TokenApi,
  TokenMetadata,
  PoolConfig,
  CreateTokenParams,
  CreateTokenResult,
  GetTokenStatusParams,
  TokenStatus,

  // Config
  VertigoConfig,
  DFlowSwapApiConfig,
  TokenApiConfig,

  // SDK-level swap
  SwapArgs,
  SwapResult,
  SwapStatusResult,

  // Pool operations
  BuyArgs,
  SellArgs,
  CreateArgs,
  FeeParams,
  ClaimArgs,

  // Quotes
  QuoteArgs,
  QuoteResult,

  // Pool data
  PoolData,
} from '@vertigo-amm/vertigo-sdk'
```

### Value Exports

```ts
import {
  VertigoClient,
  createDFlowSwapApi,
  createDefaultTokenApi,
} from '@vertigo-amm/vertigo-sdk'
```
