# Migration Guide: v2 → v3

This guide will help you migrate from Vertigo SDK v2 to v3.

## Overview of Changes

v3 is a complete rewrite that simplifies the API and removes confusing abstractions. The main changes are:

1. **Simplified Architecture**: Three clear layers (Instructions, Helpers, Builders) instead of complex client classes
2. **No Fake Quotes**: You no longer need to construct quote objects artificially to build transactions
3. **Direction Inference**: The SDK automatically determines buy vs sell from pool + mints
4. **Functional API**: Class-based clients replaced with functional helpers
5. **Better Tree-Shaking**: Import only what you need

## Breaking Changes

### Client Initialization

**v2:**
```typescript
import { VertigoClient } from '@vertigo-amm/vertigo-sdk';

const client = await VertigoClient.load({
  connection,
  wallet,
  network: 'mainnet',
  apiUrl: 'https://api.vertigo.so',
  cache: { enabled: true, ttl: 60000 },
  // ... many other options
});
```

**v3:**
```typescript
import { Vertigo } from '@vertigo-amm/vertigo-sdk';

const vertigo = await Vertigo.load({
  connection,
  wallet,
  network: 'mainnet',
  // That's it! Much simpler.
});
```

### Swaps

**v2:**
```typescript
// Had to get quote first, even if you didn't need it
const quote = await client.swap.getQuote({
  inputMint: SOL,
  outputMint: USDC,
  amount: 1_000_000_000,
});

// Then build and execute with confusing buy/sell methods
const result = await client.swap.buy({
  pool: poolAddress,
  quoteAmount: amount,
  options: { slippageBps: 50 }
});
```

**v3:**
```typescript
// Just swap! The SDK figures out the direction
const result = await vertigo.swap({
  pool: poolAddress,
  inputMint: SOL,
  outputMint: USDC,
  amount: 1_000_000_000,
  slippageBps: 50
});
```

### Quotes

**v2:**
```typescript
const quote = await client.swap.getQuote({
  inputMint: SOL,
  outputMint: USDC,
  amount: 1_000_000_000,
  slippageBps: 50,
});
```

**v3:**
```typescript
const quote = await vertigo.quote({
  pool: poolAddress,
  inputMint: SOL,
  outputMint: USDC,
  amount: 1_000_000_000,
  slippageBps: 50,
});
```

### Pool Creation

**v2:**
```typescript
const result = await client.pools.createPool({
  mintA: SOL,
  mintB: TOKEN,
  initialMarketCap: 10_000_000_000,
  royaltiesBps: 250,
});
```

**v3:**
```typescript
const result = await vertigo.create({
  owner: ownerKeypair,
  tokenWalletAuthority: authorityKeypair,
  mintA: SOL,
  mintB: TOKEN,
  initialMarketCap: 10_000_000_000,
  initialTokenBReserves: 1_000_000_000,
  royaltiesBps: 250,
});
```

### Fee Claims

**v2:**
```typescript
const signature = await client.pools.claimFees(
  poolAddress,
  destinationAccount
);
```

**v3:**
```typescript
const result = await vertigo.claim({
  pool: poolAddress,
  destinationAccount, // optional
});
```

### Pool Data Fetching

**v2:**
```typescript
const pool = await client.pools.getPool(poolAddress);
const allPools = await client.pools.getAllPools();
```

**v3:**
```typescript
// Pool fetching is now done internally by helpers
// If you need raw pool data, use the program directly:
const accountInfo = await vertigo.connection.getAccountInfo(poolAddress);
const poolData = vertigo.program.coder.accounts.decode('pool', accountInfo.data);
```

## New Features

### Layer 1: Direct Instruction Access

For advanced users who want full control:

```typescript
import { instructions } from '@vertigo-amm/vertigo-sdk';

// Get just the instruction
const ix = await instructions.buyInstruction({
  program: vertigo.program,
  pool: poolAddress,
  user: wallet.publicKey,
  owner: poolOwner,
  mintA: SOL,
  mintB: TOKEN,
  userTaA: inputAta,
  userTaB: outputAta,
  vaultA,
  vaultB,
  amount: new anchor.BN(1_000_000_000),
  limit: new anchor.BN(900_000_000),
});

// Build your own transaction
const tx = new Transaction().add(ix);
```

### Layer 2: Smart Helpers

The recommended way to interact with the protocol:

```typescript
import { swap, quote, claim, create } from '@vertigo-amm/vertigo-sdk';

// These are the same helpers used by the client
const result = await swap({
  program: vertigo.program,
  connection: vertigo.connection,
  pool: poolAddress,
  inputMint: SOL,
  outputMint: USDC,
  amount: new anchor.BN(1_000_000_000),
  user: wallet.publicKey,
  slippageBps: 50,
});
```

### Layer 3: Param Builders

Optional utilities for constructing parameters with validation:

```typescript
import { buildSwapParams, buildCreateParams } from '@vertigo-amm/vertigo-sdk';

const swapParams = buildSwapParams({
  program: vertigo.program,
  connection: vertigo.connection,
  pool: poolAddress,
  inputMint: SOL,
  outputMint: USDC,
  amount: 1_000_000_000, // Accepts number or BN
  user: wallet.publicKey,
  slippageBps: 50,
});

await swap(swapParams);
```

## Removed Features

### Removed: Class-Based Clients

- `VertigoClient` class → `Vertigo` namespace
- `SwapClient` class → `swap` helper function
- `PoolClient` class → helper functions
- `RelayClient` class → removed (use program directly)
- `PoolAuthorityClient` class → removed (use program directly)

### Removed: API Client

The API client has been removed. If you need market data, query the Vertigo API directly:

```typescript
const response = await fetch('https://api.vertigo.so/pools');
const pools = await response.json();
```

### Removed: buildBuyTransaction / buildSellTransaction

These methods were confusing because they required a quote that already encoded the direction.

**v2:**
```typescript
// Confusing: quote already knows it's a buy, why do I need to call buildBuyTransaction?
const quote = await client.swap.getQuote({...});
const tx = await client.swap.buildBuyTransaction(pool, quote, options);
```

**v3:**
```typescript
// Clear: swap helper does it all for you
const result = await vertigo.swap({...});

// Or for advanced use, build the instruction directly
const ix = await instructions.buyInstruction({...});
```

## Import Changes

### Package Exports

v3 uses modern package exports for better tree-shaking:

```typescript
// Main export
import { Vertigo } from '@vertigo-amm/vertigo-sdk';

// Instructions (low-level)
import { buyInstruction, sellInstruction } from '@vertigo-amm/vertigo-sdk/instructions';

// Helpers (mid-level)
import { swap, quote } from '@vertigo-amm/vertigo-sdk/helpers';

// Builders (convenience)
import { buildSwapParams } from '@vertigo-amm/vertigo-sdk/builders';
```

## Migration Checklist

- [ ] Update `@vertigo-amm/vertigo-sdk` to v3.x
- [ ] Replace `VertigoClient.load()` with `Vertigo.load()`
- [ ] Simplify config object (remove unused options)
- [ ] Replace `client.swap.buy()` / `client.swap.sell()` with `vertigo.swap()`
- [ ] Replace `client.swap.getQuote()` with `vertigo.quote()`
- [ ] Replace `client.pools.createPool()` with `vertigo.create()`
- [ ] Replace `client.pools.claimFees()` with `vertigo.claim()`
- [ ] Remove any `buildBuyTransaction` / `buildSellTransaction` calls
- [ ] Update tests to use new API
- [ ] Remove API client usage (if any)

## Example: Full Migration

**v2:**
```typescript
import { VertigoClient } from '@vertigo-amm/vertigo-sdk';

const client = await VertigoClient.load({
  connection,
  wallet,
  network: 'mainnet',
  cache: { enabled: true },
});

const quote = await client.swap.getQuote({
  inputMint: SOL,
  outputMint: USDC,
  amount: 1_000_000_000,
});

const result = await client.swap.buy({
  pool: poolAddress,
  quoteAmount: quote.inputAmount,
  options: { slippageBps: 50 }
});
```

**v3:**
```typescript
import { Vertigo } from '@vertigo-amm/vertigo-sdk';

const vertigo = await Vertigo.load({
  connection,
  wallet,
  network: 'mainnet',
});

const result = await vertigo.swap({
  pool: poolAddress,
  inputMint: SOL,
  outputMint: USDC,
  amount: 1_000_000_000,
  slippageBps: 50,
});
```

## Need Help?

If you encounter issues during migration:

1. Check the [README](./README.md) for updated examples
2. Review the [test files](./tests/integration/) for working examples
3. Open an issue on [GitHub](https://github.com/vertigo-protocol/vertigo-sdk/issues)

## Philosophy

v3 follows these principles:

1. **Simplicity over Abstraction**: Don't hide what the program does
2. **Explicit over Implicit**: Direction should be clear from parameters
3. **Layered Architecture**: Choose your level of control
4. **Zero Magic**: No fake quotes or artificial construction patterns
