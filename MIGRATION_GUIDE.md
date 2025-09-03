# Migration Guide: Vertigo SDK v1 → v2

This guide will help you migrate from Vertigo SDK v1 (`@vertigo-amm/vertigo-sdk`) to v2 (`@vertigo/sdk`).

## 📦 Package Changes

### Installation

**v1:**

```bash
yarn add @vertigo-amm/vertigo-sdk
```

**v2:**

```bash
yarn add @vertigo/sdk
```

### Import Changes

**v1:**

```typescript
import { VertigoSDK } from "@vertigo-amm/vertigo-sdk";
import { SDKConfig } from "@vertigo-amm/vertigo-sdk";
```

**v2:**

```typescript
// New recommended approach
import { Vertigo } from "@vertigo/sdk";

// Or use specific clients
import { VertigoClient, PoolClient, SwapClient } from "@vertigo/sdk";

// Legacy SDK still available for gradual migration
import { VertigoSDK } from "@vertigo/sdk";
```

## 🔄 Initialization Changes

### Basic Setup

**v1:**

```typescript
import * as anchor from "@coral-xyz/anchor";
import { VertigoSDK } from "@vertigo-amm/vertigo-sdk";

const provider = new anchor.AnchorProvider(connection, wallet);
const sdk = new VertigoSDK(provider, {
  logLevel: "verbose",
  explorer: "solscan",
});
```

**v2:**

```typescript
import { Vertigo } from "@vertigo/sdk";

// Simple initialization
const vertigo = await Vertigo.load({
  connection,
  wallet,
  network: "mainnet",
});

// With custom config
const vertigo = await Vertigo.load({
  connection,
  wallet,
  network: "mainnet",
  priority: {
    autoFee: true,
    baseFee: 1000,
  },
  cache: {
    enabled: true,
    ttl: 60000,
  },
});
```

### Read-Only Mode

**v1:**

```typescript
// Not well supported - required wallet even for reads
const provider = new anchor.AnchorProvider(connection, dummyWallet);
const sdk = new VertigoSDK(provider);
```

**v2:**

```typescript
// Explicit read-only mode
const vertigo = await Vertigo.loadReadOnly(connection, "mainnet");
```

## 🏊 Pool Operations

### Getting Pool Address

**v1:**

```typescript
const poolAddress = sdk.getPoolAddress(owner, mintA, mintB);
```

**v2:**

```typescript
const poolAddress = vertigo.pools.getPoolAddress(owner, mintA, mintB);
```

### Creating a Pool

**v1:**

```typescript
const createRequest = {
  params: {
    shift: new anchor.BN(initialMarketCap),
    initialTokenBReserves: new anchor.BN(1_000_000_000),
    feeParams: {
      normalizationPeriod: new anchor.BN(3600),
      decay: 0.99,
      royaltiesBps: 250,
      privilegedSwapper: undefined,
      reference: new anchor.BN(Date.now() / 1000),
    },
  },
  payer: wallet.payer,
  owner: ownerKeypair,
  tokenWalletAuthority: authorityKeypair,
  tokenWalletB: tokenWalletAddress,
  mintA: NATIVE_MINT,
  mintB: tokenMint,
  tokenProgramA: TOKEN_PROGRAM_ID,
  tokenProgramB: TOKEN_PROGRAM_ID,
};

const signature = await sdk.create(createRequest);
```

**v2:**

```typescript
// Simplified interface
const { signature, poolAddress } = await vertigo.pools.createPool({
  mintA: NATIVE_MINT,
  mintB: tokenMint,
  initialMarketCap: 10_000_000_000,
  royaltiesBps: 250,
  launchTime: new anchor.BN(Date.now() / 1000),
});
```

### Getting Pool Data

**v1:**

```typescript
// Manual fetching required
const poolAccount = await program.account.pool.fetch(poolAddress);
```

**v2:**

```typescript
// Built-in pool data fetching
const pool = await vertigo.pools.getPool(poolAddress);

// Get multiple pools
const pools = await vertigo.pools.getPools([pool1, pool2, pool3]);

// Find pools by mints
const pools = await vertigo.pools.findPoolsByMints(mintA, mintB);

// Get pool statistics
const stats = await vertigo.pools.getPoolStats(poolAddress);
```

## 💱 Swap Operations

### Getting Quotes

**v1:**

```typescript
const quoteBuyResult = await sdk.quoteBuy({
  params: { amount, limit },
  owner,
  user,
  mintA,
  mintB,
});

const quoteSellResult = await sdk.quoteSell({
  params: { amount, limit },
  owner,
  user,
  mintA,
  mintB,
});
```

**v2:**

```typescript
// Unified quote interface
const quote = await vertigo.swap.getQuote({
  inputMint: mintA,
  outputMint: mintB,
  amount: 1_000_000_000,
  slippageBps: 50, // 0.5%
});

// Quote includes more information
console.log(quote.outputAmount);
console.log(quote.minimumReceived);
console.log(quote.priceImpact);
console.log(quote.route);
```

### Executing Swaps

**v1:**

```typescript
// Buy
const buySignature = await sdk.buy({
  params: { amount, limit },
  user: wallet.payer,
  owner,
  mintA,
  mintB,
  userTokenAccountA,
  userTokenAccountB,
});

// Sell
const sellSignature = await sdk.sell({
  params: { amount, limit },
  user: wallet.payer,
  owner,
  mintA,
  mintB,
  userTokenAccountA,
  userTokenAccountB,
});
```

**v2:**

```typescript
// Unified swap interface with automatic direction detection
const result = await vertigo.swap.swap({
  inputMint: mintA,
  outputMint: mintB,
  amount: 1_000_000_000,
  options: {
    slippageBps: 100, // 1%
    priorityFee: "auto", // Automatic priority fee
    wrapSol: true, // Auto-wrap SOL if needed
    simulateFirst: true, // Simulate before executing
  },
});

console.log(result.signature);
console.log(result.inputAmount);
console.log(result.outputAmount);
```

### Swap Simulation

**v1:**

```typescript
// Not available - manual simulation required
```

**v2:**

```typescript
// Built-in simulation
const simulation = await vertigo.swap.simulateSwap({
  inputMint: mintA,
  outputMint: mintB,
  amount: 1_000_000_000,
  options: { slippageBps: 100 },
});

if (simulation.success) {
  console.log(`Expected output: ${simulation.outputAmount}`);
  // Proceed with actual swap
} else {
  console.error(`Simulation failed: ${simulation.error}`);
}
```

## 🏭 Token Factory

**v1:**

```typescript
// Not available in SDK v1
```

**v2:**

```typescript
// Launch a token
const { mintAddress } = await vertigo.factory.launchToken({
  metadata: {
    name: "My Token",
    symbol: "MTK",
    decimals: 9,
    uri: "https://...",
  },
  supply: 1_000_000_000_000_000,
  useToken2022: false,
});

// Launch token with pool
const result = await vertigo.factory.launchTokenWithPool({
  metadata: { name: "My Token", symbol: "MTK" },
  supply: 1_000_000_000_000_000,
  initialMarketCap: 50_000_000_000,
  royaltiesBps: 250,
});
```

## 📊 API Integration

**v1:**

```typescript
// No API client - manual fetch required
const response = await fetch("https://api.vertigo.so/pools");
const data = await response.json();
```

**v2:**

```typescript
// Built-in API client
const stats = await vertigo.api.getPoolStats(poolAddress);
const trending = await vertigo.api.getTrendingPools("24h", 10);
const tokenInfo = await vertigo.api.getTokenInfo(mintAddress);

// Real-time subscriptions
const unsubscribe = vertigo.api.subscribeToPool(poolAddress, {
  onSwap: (data) => console.log("Swap event:", data),
  onPriceUpdate: (data) => console.log("Price update:", data),
});
```

## 🛠️ Utility Functions

**v1:**

```typescript
import {
  getPoolPda,
  validateLaunchParams,
} from "@vertigo-amm/vertigo-sdk/utils";

const [pool] = getPoolPda(owner, mintA, mintB, programId);
validateLaunchParams(params);
```

**v2:**

```typescript
import {
  formatTokenAmount,
  parseTokenAmount,
  getOrCreateATA,
  estimatePriorityFee,
  retry,
  getExplorerUrl,
  sendTransactionWithRetry,
} from "@vertigo/sdk";

// Rich utility functions
const formatted = formatTokenAmount(amount, decimals);
const parsed = parseTokenAmount("1.5", 9);
const { address, instruction } = await getOrCreateATA(connection, mint, owner);
const fee = await estimatePriorityFee(connection);
const url = getExplorerUrl(signature, "mainnet");

// Transaction helpers
const signature = await sendTransactionWithRetry(
  connection,
  transaction,
  signers,
  { maxRetries: 3 },
);
```

## 🔧 Transaction Building

**v1:**

```typescript
const instructions = await sdk.createInstruction(request);
const tx = new Transaction().add(...instructions);
const signature = await provider.sendAndConfirm(tx, signers);
```

**v2:**

```typescript
// Automatic transaction optimization
const tx = await vertigo.swap.buildSwapTransaction(quote, {
  priorityFee: "auto",
  computeUnits: 200000,
});

// Or use the high-level interface
const result = await vertigo.swap.swap({
  inputMint,
  outputMint,
  amount,
  options: { priorityFee: "auto" },
});
```

## 🎯 Error Handling

**v1:**

```typescript
try {
  const signature = await sdk.buy(request);
} catch (error) {
  // Generic error handling
  console.error("Failed:", error);
}
```

**v2:**

```typescript
try {
  const result = await vertigo.swap.swap({...});
} catch (error) {
  if (error.code === "SLIPPAGE_EXCEEDED") {
    // Handle specific error
  } else if (error.code === "INSUFFICIENT_FUNDS") {
    // Handle another error
  }
  // Better error messages and types
  console.error(`Swap failed: ${error.message}`);
}
```

## 🚀 Migration Strategy

### Option 1: Gradual Migration

The v2 SDK includes the legacy `VertigoSDK` class for backwards compatibility:

```typescript
// Step 1: Update package
yarn add @vertigo/sdk

// Step 2: Update imports (SDK still works the same)
import { VertigoSDK } from "@vertigo/sdk";

// Step 3: Gradually migrate to new API
import { Vertigo } from "@vertigo/sdk";
const vertigo = await Vertigo.load({...});
```

### Option 2: Full Migration

1. **Update all imports** to use the new package
2. **Replace initialization** with `Vertigo.load()`
3. **Update method calls** to use the new client modules
4. **Test thoroughly** with the new simulation features
5. **Leverage new features** like API client and utilities

## 📚 Resources

- [Full Documentation](https://docs.vertigo.so)
- [API Reference](https://api.vertigo.so/docs)
- [Examples](./examples/)
- [GitHub Issues](https://github.com/vertigo-protocol/vertigo-sdk/issues)
- [Discord Support](https://discord.gg/vertigo)

## 🤝 Need Help?

If you encounter any issues during migration:

1. Check the [examples](./examples/) directory for working code
2. Review the [API documentation](https://docs.vertigo.so)
3. Ask in our [Discord](https://discord.gg/vertigo) #sdk-support channel
4. Open an [issue](https://github.com/vertigo-protocol/vertigo-sdk/issues) on GitHub

## ✨ New Features in v2

Take advantage of these new capabilities:

- **API Client**: Access market data without manual fetching
- **Transaction Utilities**: Automatic retries, priority fees, and simulation
- **Token Utilities**: Format amounts, manage accounts, parse user input
- **Factory Client**: Launch tokens and create pools programmatically
- **Relay Client**: Use permissioned relays for advanced trading
- **WebSocket Support**: Real-time updates for pools and prices
- **Better TypeScript**: Full type safety and IntelliSense support
- **Caching**: Automatic caching for better performance
- **Error Recovery**: Built-in retry logic with exponential backoff

---

The v2 SDK is designed to make your development experience smoother and more productive. While it requires some migration effort, the benefits include better performance, cleaner code, and access to powerful new features.
