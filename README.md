# Vertigo SDK

TypeScript SDK for the [Vertigo AMM](https://vertigo.so) protocol on Solana.

> **[Full API Reference →](./DOCS.md)**

## Installation

```bash
pnpm add @vertigo-amm/vertigo-sdk
```

Peer dependencies: `@coral-xyz/anchor`, `@solana/web3.js`, `@solana/spl-token`.

## Quick Start

```ts
import { AnchorProvider, Wallet } from '@coral-xyz/anchor'
import { Connection, Keypair } from '@solana/web3.js'
import { VertigoClient } from '@vertigo-amm/vertigo-sdk'

const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed')
const wallet = new Wallet(Keypair.fromSecretKey(/* ... */))
const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' })

// On-chain only (buy, sell, create, claim, quote)
const client = new VertigoClient(provider)

// With swap routing (dFlow default)
const client = new VertigoClient(provider, { swapApiKey: 'DFLOW_KEY' })

// With token creation (Vertigo backend default)
const client = new VertigoClient(provider, { tokenApiKey: 'VERTIGO_KEY' })

// Both
const client = new VertigoClient(provider, {
  swapApiKey: 'DFLOW_KEY',
  tokenApiKey: 'VERTIGO_KEY',
})
```

## Configuration

Swap routing and token creation are **pluggable** — pass either API credentials for the built-in defaults, or a custom adapter. TypeScript enforces that you pick one or the other:

```ts
// Custom swap adapter (Jupiter, your own router, etc.)
const client = new VertigoClient(provider, { swapApi: myJupiterAdapter })

// Custom token backend
const client = new VertigoClient(provider, { tokenApi: myBackend })

// Custom program ID
const client = new VertigoClient(provider, {
  programId: new PublicKey('YOUR_PROGRAM_ID'),
})
```

See [DOCS.md — Configuration](./DOCS.md#configuration) for the full config type and resolution rules.

## Usage

### Swap (via adapter)

```ts
const { transaction, expectedOutput } = await client.swap({
  inputMint: SOL_MINT,
  outputMint: USDC_MINT,
  amount: 1_000_000_000,
  user: wallet.publicKey,
})

transaction.sign([wallet.payer])
const signature = await client.submitSwap(transaction)
const { success } = await client.swapStatus(signature)
```

### Token Creation (via adapter)

```ts
const { transaction, mint, pool } = await client.createToken({
  payer: wallet.publicKey.toBase58(),
  metadata: { name: 'My Token', symbol: 'MTK', description: '...', image: '...' },
  poolConfig: {
    shift: '1000000',
    initialTokenBReserves: '1000000000',
    feeParams: { normalizationPeriod: '600', decay: 0.5, royaltiesBps: 250, reference: '0' },
  },
})

transaction.sign([wallet.payer])
await provider.connection.sendRawTransaction(transaction.serialize())

const status = await client.getTokenStatus(mint)
```

### Pool Operations (on-chain)

```ts
// Create pool
await client.create({ payer, owner, tokenWalletAuthority, mintA, mintB, tokenWalletB, shift, initialTokenBReserves, feeParams })

// Buy / Sell
await client.buy({ pool, user, owner, mintA, mintB, userTaA, userTaB, amount, limit })
await client.sell({ pool, user, owner, mintA, mintB, userTaA, userTaB, amount, limit })

// Claim royalties
await client.claim({ pool, claimer, mintA, receiverTaA })

// Quotes (read-only, no transaction)
const { amountA, amountB, feeA } = await client.quoteBuy({ pool, owner, user, mintA, mintB, amount, limit })

// Pool data
const poolData = await client.getPool(poolAddress)

// PDA derivation (no RPC)
const poolPda = client.poolPda(owner, mintA, mintB)
const vaultPda = client.vaultPda(poolPda, mintA)
```

### Building Raw Instructions

For custom transaction composition:

```ts
const buyIx = await client.buildBuyIx({ /* BuyArgs */ })
const tx = new Transaction()
  .add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50_000 }))
  .add(buyIx)
await provider.sendAndConfirm(tx, [])
```

Also: `buildSellIx`, `buildCreateIx`, `buildClaimIx`.

## API Overview

| Method | Description |
|--------|-------------|
| `swap(args)` | Get unsigned swap tx via adapter |
| `submitSwap(signedTx)` | Submit signed swap transaction |
| `swapStatus(signature)` | Check swap confirmation |
| `createToken(params)` | Create token via adapter |
| `getTokenStatus(mint)` | Check token indexing status |
| `buy(args)` | Buy tokens from pool |
| `sell(args)` | Sell tokens to pool |
| `create(args)` | Create a new pool |
| `claim(args)` | Claim royalties |
| `quoteBuy(args)` / `quoteSell(args)` | Read-only quotes |
| `buildBuyIx` / `buildSellIx` / `buildCreateIx` / `buildClaimIx` | Raw instructions |
| `getPool(pool)` | Fetch pool data |
| `getAllPools()` | Fetch all pools on-chain |
| `poolPda(owner, mintA, mintB)` / `vaultPda(pool, mint)` | PDA derivation |

Full type signatures, adapter contracts, and backend endpoint specs in **[DOCS.md](./DOCS.md)**.

## Development

```bash
pnpm test          # run tests
pnpm typecheck     # type check
pnpm build         # build
```

## License

MIT
