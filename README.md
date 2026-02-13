# Vertigo SDK

TypeScript SDK for the Vertigo AMM protocol on Solana. Provides pool operations (create, buy, sell, claim, quote), pluggable swap routing, and backend token creation through a single `VertigoClient` class.

> **[Full API Reference →](./DOCS.md)**

## Installation

```bash
pnpm add @vertigo-amm/vertigo-sdk
```

Peer dependencies: `@coral-xyz/anchor`, `@solana/web3.js`, `@solana/spl-token`.

## Quick Start

```typescript
import { AnchorProvider, Wallet } from '@coral-xyz/anchor'
import { Connection, Keypair } from '@solana/web3.js'
import { VertigoClient } from '@vertigo-amm/vertigo-sdk'

const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed')
const wallet = new Wallet(Keypair.fromSecretKey(/* ... */))
const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' })

const client = new VertigoClient(provider)
```

With swap routing and/or token creation:

```typescript
const client = new VertigoClient(provider, {
  swapApiKey: process.env.DFLOW_API_KEY,       // dFlow swap routing
  tokenApiKey: process.env.VERTIGO_API_KEY,    // backend token creation
})
```

## Swap Routing

Pluggable swap routing via the `SwapApi` adapter. The default implementation uses dFlow, but you can provide any aggregator (Jupiter, your own router, etc.).

### Get a Swap Transaction

```typescript
import { PublicKey } from '@solana/web3.js'
import { BN } from '@coral-xyz/anchor'

const SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112')
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')

const result = await client.swap({
  inputMint: SOL_MINT,
  outputMint: USDC_MINT,
  amount: 1_000_000_000,      // 1 SOL in lamports
  user: wallet.publicKey,
  slippageBps: 50,             // 0.5% slippage (default)
})

console.log('Expected output:', result.expectedOutput)
console.log('Minimum output:', result.minimumOutput)
console.log('Price impact:', result.priceImpact)
```

### Sign and Submit

```typescript
// Sign the transaction (user's wallet)
result.transaction.sign([wallet.payer])

// Submit to the network
const signature = await client.submitSwap(result.transaction)
console.log('Swap submitted:', signature)

// Poll for confirmation
const status = await client.swapStatus(signature)
console.log('Status:', status.status)   // 'CLOSED' | 'PENDING_CLOSE' | 'OPEN_FAILED' | 'OPEN_EXPIRED'
console.log('Success:', status.success)  // true | false
```

### Full Swap Flow (Frontend Example)

```typescript
import { VertigoClient, type SwapArgs } from '@vertigo-amm/vertigo-sdk'

const handleSwap = async (inputMint: PublicKey, outputMint: PublicKey, amount: number) => {
  // 1. Get the unsigned transaction
  const { transaction, expectedOutput, minimumOutput } = await client.swap({
    inputMint,
    outputMint,
    amount,
    user: wallet.publicKey,
    slippageBps: 100, // 1%
  })

  // 2. Sign with the user's wallet (works with wallet adapters)
  const signed = await wallet.signTransaction(transaction)

  // 3. Submit and wait for confirmation
  const signature = await client.submitSwap(signed)

  // 4. Check status
  const { success } = await client.swapStatus(signature)
  if (!success) {
    throw new Error('Swap failed')
  }

  return { signature, expectedOutput }
}
```

## Pool Operations

### Create a Pool

```typescript
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { BN } from '@coral-xyz/anchor'

const signature = await client.create({
  payer: wallet.publicKey,
  owner: wallet.publicKey,
  tokenWalletAuthority: wallet.publicKey,
  mintA: SOL_MINT,
  mintB: TOKEN_MINT,
  tokenWalletB: tokenWalletBAddress,
  shift: new BN(1_000_000),
  initialTokenBReserves: new BN(1_000_000_000),
  feeParams: {
    normalizationPeriod: new BN(600),
    decay: 0.5,
    royaltiesBps: 250,          // 2.5% royalties
    privilegedSwapper: null,
    reference: new BN(0),
  },
  // Optional: auto-derived from PDA seeds if omitted
  // pool: poolAddress,
  // vaultA: vaultAAddress,
  // vaultB: vaultBAddress,
  // tokenProgramA: TOKEN_PROGRAM_ID,
  // tokenProgramB: TOKEN_PROGRAM_ID,
})

console.log('Pool created:', signature)
```

### Buy (SOL -> Token)

```typescript
const signature = await client.buy({
  pool: poolAddress,
  user: wallet.publicKey,
  owner: poolOwner,
  mintA: SOL_MINT,
  mintB: TOKEN_MINT,
  userTaA: userSolAccount,
  userTaB: userTokenAccount,
  amount: new BN(100_000_000),   // 0.1 SOL
  limit: new BN(0),              // minimum output (0 = no limit)
})
```

### Sell (Token -> SOL)

```typescript
const signature = await client.sell({
  pool: poolAddress,
  user: wallet.publicKey,
  owner: poolOwner,
  mintA: SOL_MINT,
  mintB: TOKEN_MINT,
  userTaA: userSolAccount,
  userTaB: userTokenAccount,
  amount: new BN(1_000_000),     // tokens to sell
  limit: new BN(0),
})
```

### Claim Royalties

```typescript
const signature = await client.claim({
  pool: poolAddress,
  claimer: wallet.publicKey,
  mintA: SOL_MINT,
  receiverTaA: receiverTokenAccount,
})
```

## Quotes

Get swap quotes without executing a transaction. Uses the on-chain `view()` method for accurate results.

```typescript
const buyQuote = await client.quoteBuy({
  pool: poolAddress,
  owner: poolOwner,
  user: wallet.publicKey,
  mintA: SOL_MINT,
  mintB: TOKEN_MINT,
  amount: new BN(100_000_000),   // 0.1 SOL
  limit: new BN(0),
})

console.log('Tokens out:', buyQuote.amountB.toString())
console.log('Fee:', buyQuote.feeA.toString())
```

```typescript
const sellQuote = await client.quoteSell({
  pool: poolAddress,
  owner: poolOwner,
  user: wallet.publicKey,
  mintA: SOL_MINT,
  mintB: TOKEN_MINT,
  amount: new BN(1_000_000),
  limit: new BN(0),
})

console.log('SOL out:', sellQuote.amountA.toString())
console.log('Fee:', sellQuote.feeA.toString())
```

## Pool Queries

### Fetch Pool Data

```typescript
const pool = await client.getPool(poolAddress)

console.log('Owner:', pool.owner.toBase58())
console.log('Mint A:', pool.mintA.toBase58())
console.log('Mint B:', pool.mintB.toBase58())
console.log('Reserve A:', pool.tokenAReserves.toString())
console.log('Reserve B:', pool.tokenBReserves.toString())
console.log('Shift:', pool.shift.toString())
console.log('Enabled:', pool.enabled)
console.log('Royalties collected:', pool.royalties.toString())
console.log('Vertigo fees:', pool.vertigoFees.toString())
console.log('Fee decay:', pool.feeParams.decay)
console.log('Royalties BPS:', pool.feeParams.royaltiesBps)
```

## PDA Helpers

Derive program addresses without RPC calls.

```typescript
// Pool PDA: seeds = ["pool", owner, mintA, mintB]
const poolAddress = client.poolPda(ownerPubkey, SOL_MINT, TOKEN_MINT)

// Vault PDA: seeds = [pool, mint]
const vaultA = client.vaultPda(poolAddress, SOL_MINT)
const vaultB = client.vaultPda(poolAddress, TOKEN_MINT)
```

### Find a Pool Address Before It Exists

```typescript
// Useful for checking if a pool already exists or pre-computing addresses
const poolAddress = client.poolPda(owner, mintA, mintB)
const accountInfo = await provider.connection.getAccountInfo(poolAddress)

if (accountInfo) {
  console.log('Pool already exists at', poolAddress.toBase58())
} else {
  console.log('Pool does not exist yet, safe to create')
}
```

## Building Instructions

When you need the raw `TransactionInstruction` instead of sending a full transaction (e.g., for composing with other instructions or using a custom signing flow):

```typescript
import { Transaction } from '@solana/web3.js'

// Build individual instructions
const buyIx = await client.buildBuyIx({ /* BuyArgs */ })
const sellIx = await client.buildSellIx({ /* SellArgs */ })
const createIx = await client.buildCreateIx({ /* CreateArgs */ })
const claimIx = await client.buildClaimIx({ /* ClaimArgs */ })

// Compose multiple instructions in a single transaction
const tx = new Transaction()
  .add(buyIx)
  .add(claimIx)

const signature = await provider.sendAndConfirm(tx, [])
```

### Example: Buy With Custom Priority Fee

```typescript
import { Transaction, ComputeBudgetProgram } from '@solana/web3.js'

const buyIx = await client.buildBuyIx({
  pool: poolAddress,
  user: wallet.publicKey,
  owner: poolOwner,
  mintA: SOL_MINT,
  mintB: TOKEN_MINT,
  userTaA: userSolAccount,
  userTaB: userTokenAccount,
  amount: new BN(100_000_000),
  limit: new BN(0),
})

const tx = new Transaction()
  .add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50_000 }))
  .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }))
  .add(buyIx)

const signature = await provider.sendAndConfirm(tx, [])
```

## Configuration

```typescript
import { PublicKey } from '@solana/web3.js'

const client = new VertigoClient(provider, {
  // Custom Vertigo program ID (default: vrTGoBuy5rYSxAfV3jaRJWHH6nN9WK4NRExGxsk1bCJ)
  programId: new PublicKey('YOUR_PROGRAM_ID'),

  // Swap routing — use dFlow default or provide a custom SwapApi
  swapApiKey: 'your-dflow-key',
  // swapApi: myJupiterAdapter,       // custom adapter takes precedence

  // Token creation — use Vertigo backend or provide a custom TokenApi
  tokenApiKey: 'your-vertigo-key',
  // tokenApi: myCustomBackend,       // custom adapter takes precedence
})
```

Without a `swapApiKey`, the dFlow default uses the dev endpoint. With a key, it uses production.

See [DOCS.md](./DOCS.md) for the full API reference, adapter contracts, and backend endpoint specs.

## API Reference

### VertigoClient

| Method | Description | Returns |
|--------|-------------|---------|
| `swap(args)` | Get unsigned swap tx via SwapApi adapter | `SwapResult` |
| `submitSwap(signedTx)` | Submit a signed swap transaction | `string` (signature) |
| `swapStatus(signature)` | Check swap confirmation status | `SwapStatusResult` |
| `createToken(params)` | Create token via TokenApi adapter | `{ transaction, mint, pool }` |
| `getTokenStatus(mint)` | Check token indexing status | `TokenStatus` |
| `buy(args)` | Execute a buy (build + send + confirm) | `string` (signature) |
| `sell(args)` | Execute a sell (build + send + confirm) | `string` (signature) |
| `create(args)` | Create a pool (build + send + confirm) | `string` (signature) |
| `claim(args)` | Claim royalties (build + send + confirm) | `string` (signature) |
| `quoteBuy(args)` | Get buy quote (read-only) | `QuoteResult` |
| `quoteSell(args)` | Get sell quote (read-only) | `QuoteResult` |
| `buildBuyIx(args)` | Build buy instruction | `TransactionInstruction` |
| `buildSellIx(args)` | Build sell instruction | `TransactionInstruction` |
| `buildCreateIx(args)` | Build create instruction | `TransactionInstruction` |
| `buildClaimIx(args)` | Build claim instruction | `TransactionInstruction` |
| `getPool(pool)` | Fetch and decode pool account | `PoolData` |
| `poolPda(owner, mintA, mintB)` | Derive pool PDA | `PublicKey` |
| `vaultPda(pool, mint)` | Derive vault PDA | `PublicKey` |

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `provider` | `AnchorProvider` | The Anchor provider |
| `program` | `Program` | The Anchor program instance |
| `programId` | `PublicKey` | The Vertigo program ID |

## Testing

```bash
pnpm test          # Run all tests
pnpm test:watch    # Watch mode
pnpm typecheck     # Type check
pnpm build         # Build
```

## License

MIT
