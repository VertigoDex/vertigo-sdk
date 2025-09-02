# Vertigo SDK v2.0

<div align="center">
  <h3>🚀 Official TypeScript SDK for the Vertigo AMM Protocol on Solana</h3>
  <p>Build powerful DeFi applications with Vertigo's innovative AMM design</p>
  
  [![npm version](https://img.shields.io/npm/v/@vertigo/sdk)](https://www.npmjs.com/package/@vertigo/sdk)
  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
  [![Documentation](https://img.shields.io/badge/docs-vertigo.so-green)](https://docs.vertigo.so)
</div>

## ✨ Features

- **🎯 Simple & Intuitive API** - Get started in minutes with our high-level client
- **🔧 Modular Architecture** - Use only what you need with tree-shakeable exports
- **⚡ High Performance** - Optimized for speed with smart caching and batching
- **🔐 Type Safety** - Full TypeScript support with comprehensive type definitions
- **📊 Real-time Data** - Built-in API client for market data and analytics
- **🛠️ Developer Tools** - Rich utilities for common blockchain operations
- **📱 Wallet Integration** - Works seamlessly with all major Solana wallets
- **🔄 Auto-retry Logic** - Robust error handling and automatic retries

## 📦 Installation

```bash
yarn add @vertigo/sdk
# or
npm install @vertigo/sdk
# or
bun install @vertigo/sdk
```

## 🚀 Quick Start

### Basic Usage (Read-Only)

```typescript
import { Vertigo } from "@vertigo/sdk";
import { Connection } from "@solana/web3.js";

// Initialize SDK without wallet (read-only)
const vertigo = await Vertigo.load({
  connection: new Connection("https://api.mainnet-beta.solana.com"),
  network: "mainnet"
});

// Find pools for a token pair
const pools = await vertigo.pools.findPoolsByMints(SOL_MINT, USDC_MINT);

// Get swap quote
const quote = await vertigo.swap.getQuote({
  inputMint: SOL_MINT,
  outputMint: USDC_MINT,
  amount: 1_000_000_000, // 1 SOL
  slippageBps: 50
});
```

### With Wallet (Full Features)

```typescript
import { Vertigo } from "@vertigo/sdk";
import { Connection, Keypair } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";

// Initialize with wallet
const wallet = new anchor.Wallet(keypair);
const vertigo = await Vertigo.load({
  connection: new Connection("https://api.mainnet-beta.solana.com"),
  wallet,
  network: "mainnet"
});

// Execute a swap
const result = await vertigo.swap.swap({
  inputMint: SOL_MINT,
  outputMint: USDC_MINT,
  amount: 1_000_000_000,
  options: {
    slippageBps: 100,
    priorityFee: "auto"
  }
});

console.log(`Swap successful: ${result.signature}`);
```

## 📚 Core Modules

### 🏊 Pool Client

Manage liquidity pools and fetch pool data:

```typescript
// Create a new pool
const { poolAddress } = await vertigo.pools.createPool({
  mintA: SOL_MINT,
  mintB: TOKEN_MINT,
  initialMarketCap: 10_000_000_000,
  royaltiesBps: 250
});

// Get pool information
const pool = await vertigo.pools.getPool(poolAddress);

// Get all pools
const pools = await vertigo.pools.getPools();

// Find pools by tokens
const pools = await vertigo.pools.findPoolsByMints(mintA, mintB);

// Get pool statistics
const stats = await vertigo.pools.getPoolStats(poolAddress);
```

### 💱 Swap Client

Execute token swaps with advanced features:

```typescript
// Get swap quote
const quote = await vertigo.swap.getQuote({
  inputMint: SOL_MINT,
  outputMint: USDC_MINT,
  amount: 1_000_000_000,
  slippageBps: 50
});

// Simulate swap to check for errors
const simulation = await vertigo.swap.simulateSwap({
  inputMint: SOL_MINT,
  outputMint: USDC_MINT,
  amount: 1_000_000_000
});

// Execute swap
const result = await vertigo.swap.swap({
  inputMint: SOL_MINT,
  outputMint: USDC_MINT,
  amount: 1_000_000_000,
  options: {
    slippageBps: 100,
    wrapSol: true,
    priorityFee: "auto"
  }
});
```

### 🏗️ Pool Authority Client

Advanced pool management for authorized users:

```typescript
import { PoolAuthority } from "@vertigo/sdk";

// Initialize Pool Authority client
const poolAuth = await PoolAuthority.load({ 
  connection, 
  wallet 
});

// Create pools with authority permissions
// Note: Token factory features are under development
```

### 📊 API Client

Access market data and analytics:

```typescript
// Get pool statistics
const stats = await vertigo.api.getPoolStats(poolAddress);

// Get trending pools
const trending = await vertigo.api.getTrendingPools("24h", 10);

// Get token information
const tokenInfo = await vertigo.api.getTokenInfo(mintAddress);

// Subscribe to pool updates
const unsubscribe = vertigo.api.subscribeToPool(poolAddress, {
  onUpdate: (data) => console.log("Pool update:", data)
});
```

## 🛠️ Utility Functions

The SDK includes rich utilities for common operations:

```typescript
import { 
  formatTokenAmount,
  parseTokenAmount,
  getOrCreateATA,
  estimatePriorityFee,
  retry,
  getExplorerUrl
} from "@vertigo/sdk";

// Format token amounts
const formatted = formatTokenAmount(amount, decimals, 4);

// Parse user input
const amount = parseTokenAmount("1.5", 9);

// Get or create token accounts
const { address, instruction } = await getOrCreateATA(connection, mint, owner);

// Estimate network fees
const fee = await estimatePriorityFee(connection, 75);

// Retry with exponential backoff
const result = await retry(() => fetchData(), { maxRetries: 3 });

// Get explorer links
const url = getExplorerUrl(signature, "mainnet", "solscan");
```

## ⚙️ Advanced Configuration

```typescript
const vertigo = await Vertigo.load({
  connection,
  wallet,
  network: "mainnet",
  
  // Custom program addresses
  programs: {
    amm: customAmmAddress,
    factory: customFactoryAddress
  },
  
  // API configuration
  apiUrl: "https://api.vertigo.so",
  
  // Caching settings
  cache: {
    enabled: true,
    ttl: 60000 // 1 minute
  },
  
  // Transaction settings
  priority: {
    autoFee: true,
    baseFee: 1000,
    maxFee: 1000000
  }
});
```

## 🎯 Examples

Check out our test files for usage examples:

- [Integration Tests](./tests/integration/)
- [Unit Tests](./tests/unit/)
- [Full Integration Test](./tests/integration/full-integration.test.ts)

## 🧪 Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run integration tests
npm run test:integration

# Run full devnet integration test
npm run test:full

# Run devnet tests with various options
npm run test:devnet
npm run test:devnet:verbose
```

## 🔄 Migration from v1

If you're upgrading from SDK v1:

```typescript
// Old (v1)
import { VertigoSDK } from "@vertigo-amm/vertigo-sdk";
const sdk = new VertigoSDK(provider);

// New (v2)
import { Vertigo } from "@vertigo/sdk";
const vertigo = await Vertigo.load({ connection, wallet });

// The old SDK is still available for backwards compatibility
import { VertigoSDK } from "@vertigo/sdk";
```

## 🔗 Network Support

| Network | Status | RPC Endpoint |
|---------|--------|-------------|
| Mainnet | ✅ Supported | https://api.mainnet-beta.solana.com |
| Devnet | ✅ Supported | https://api.devnet.solana.com |
| Testnet | ✅ Supported | https://api.testnet.solana.com |
| Localnet | ✅ Supported | http://localhost:8899 |

## 📖 Documentation

- [Full Documentation](https://docs.vertigo.so)
- [API Reference](https://api.vertigo.so/docs)
- [Integration Guide](https://docs.vertigo.so/integration)
- [GitHub Repository](https://github.com/vertigo-protocol/vertigo-sdk)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 🐛 Support

- **Discord**: [Join our community](https://discord.gg/vertigo)
- **GitHub Issues**: [Report bugs](https://github.com/vertigo-protocol/vertigo-sdk/issues)
- **Email**: sdk@vertigo.so

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

<div align="center">
  <p>Built with ❤️ by the Vertigo Protocol team</p>
  <p>
    <a href="https://vertigo.so">Website</a> •
    <a href="https://twitter.com/vertigoprotocol">Twitter</a> •
    <a href="https://discord.gg/vertigo">Discord</a>
  </p>
</div>