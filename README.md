# Vertigo SDK v3.0

<div align="center">
  <h3>🚀 Official TypeScript SDK for the Vertigo AMM Protocol on Solana</h3>
  <p>Build powerful DeFi applications with Vertigo's innovative AMM design</p>

  [![npm version](https://img.shields.io/npm/v/@vertigo-amm/vertigo-sdk)](https://www.npmjs.com/package/@vertigo-amm/vertigo-sdk)
  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
  [![Documentation](https://img.shields.io/badge/docs-vertigo.so-green)](https://docs.vertigo.so)
</div>

## 🎉 What's New in v3

v3 is a complete rewrite focused on simplicity and clarity:

- **🎯 Clear Architecture**: Three layers (Instructions → Helpers → Builders) instead of complex classes
- **🔄 No Fake Quotes**: Swap direction inferred automatically from pool + mints
- **⚡ Simpler API**: Less configuration, more functionality
- **📦 Better Tree-Shaking**: Import only what you need
- **🧩 Layered Control**: Choose your level of abstraction

**Migrating from v2?** See the [Migration Guide](./MIGRATION.md).

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
yarn add @vertigo-amm/vertigo-sdk
# or
npm install @vertigo-amm/vertigo-sdk
# or
bun install @vertigo-amm/vertigo-sdk
```

## 🚀 Quick Start

### Basic Usage (Read-Only)

```typescript
import { Vertigo } from "@vertigo-amm/vertigo-sdk";
import { Connection } from "@solana/web3.js";

// Initialize SDK without wallet (read-only)
const vertigo = await Vertigo.load({
  connection: new Connection("https://api.mainnet-beta.solana.com"),
  network: "mainnet",
});

// Get swap quote
const quote = await vertigo.quote({
  pool: poolAddress,
  inputMint: SOL_MINT,
  outputMint: USDC_MINT,
  amount: 1_000_000_000, // 1 SOL
  slippageBps: 50,
});

console.log(`You'll receive ${quote.outputAmount} tokens`);
```

### With Wallet (Full Features)

```typescript
import { Vertigo } from "@vertigo-amm/vertigo-sdk";
import { Connection } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";

// Initialize with wallet
const wallet = new anchor.Wallet(keypair);
const vertigo = await Vertigo.load({
  connection: new Connection("https://api.mainnet-beta.solana.com"),
  wallet,
  network: "mainnet",
});

// Execute a swap - direction is inferred automatically!
const result = await vertigo.swap({
  pool: poolAddress,
  inputMint: SOL_MINT,
  outputMint: USDC_MINT,
  amount: 1_000_000_000,
  slippageBps: 100,
  priorityFee: 10000,
});

console.log(`Swap successful: ${result.signature}`);
console.log(`Spent ${result.inputAmount}, received ${result.outputAmount}`);
```

## 📚 Three Layers of Control

v3 provides three layers, so you can choose your level of abstraction:

### Layer 1: Instructions (Low-Level)

Direct wrappers around Anchor program instructions. For users who want maximum control:

```typescript
import { instructions } from "@vertigo-amm/vertigo-sdk";

// Get just the instruction
const ix = await instructions.buyInstruction({
  program: vertigo.program,
  pool: poolAddress,
  user: wallet.publicKey,
  owner: poolOwner,
  mintA: SOL_MINT,
  mintB: TOKEN_MINT,
  userTaA: inputTokenAccount,
  userTaB: outputTokenAccount,
  vaultA,
  vaultB,
  amount: new anchor.BN(1_000_000_000),
  limit: new anchor.BN(900_000_000),
});

// Build your own transaction
const tx = new Transaction().add(ix);
await program.provider.sendAndConfirm(tx);
```

### Layer 2: Helpers (Mid-Level) - **RECOMMENDED**

Smart helpers that handle common patterns automatically:

```typescript
// Quote - determines buy/sell automatically from pool + mints
const quote = await vertigo.quote({
  pool: poolAddress,
  inputMint: SOL_MINT,
  outputMint: USDC_MINT,
  amount: 1_000_000_000,
  slippageBps: 50,
});

// Swap - handles ATAs, direction detection, wrapping, etc.
const result = await vertigo.swap({
  pool: poolAddress,
  inputMint: SOL_MINT,
  outputMint: USDC_MINT,
  amount: 1_000_000_000,
  slippageBps: 100,
  wrapSol: true,
  priorityFee: 10000,
});

// Create pool
const { poolAddress, signature } = await vertigo.create({
  owner: ownerKeypair,
  tokenWalletAuthority: authorityKeypair,
  mintA: SOL_MINT,
  mintB: TOKEN_MINT,
  initialMarketCap: 10_000_000_000,
  initialTokenBReserves: 1_000_000_000,
  royaltiesBps: 250,
});

// Claim fees
const { signature } = await vertigo.claim({
  pool: poolAddress,
  destinationAccount, // optional
  priorityFee: 10000,
});
```

### Layer 3: Builders (Convenience)

Optional utilities for constructing parameters with validation:

```typescript
import { buildSwapParams, buildFeeParams } from "@vertigo-amm/vertigo-sdk";

// Build params with validation and defaults
const swapParams = buildSwapParams({
  program: vertigo.program,
  connection: vertigo.connection,
  pool: poolAddress,
  inputMint: SOL_MINT,
  outputMint: USDC_MINT,
  amount: 1_000_000_000, // Accepts number or BN
  user: wallet.publicKey,
});

// Use with helper
const result = await swap(swapParams);

// Build fee params with validation
const feeParams = buildFeeParams({
  royaltiesBps: 250, // Validated to be 0-10000
  decay: 0.99, // Validated to be 0-1
  normalizationPeriod: 3600,
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
  getExplorerUrl,
  createTokenMetadata,
} from "@vertigo-amm/vertigo-sdk";

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

// Create token metadata for token factories
const metadata = createTokenMetadata(
  "My Token",
  "MYTKN",
  "https://example.com/metadata.json"
);
```

### 🪙 Token Metadata Helper

When creating tokens with the factory programs, use the `createTokenMetadata` helper for validation:

```typescript
import { createTokenMetadata } from "@vertigo-amm/vertigo-sdk";

// Create and validate token metadata
const metadata = createTokenMetadata(
  "My Amazing Token", // name (max 32 characters)
  "MAT",              // symbol (max 10 characters, auto-uppercased)
  "https://example.com/token-metadata.json" // URI to off-chain metadata
);

// Use with token factory launch params
const launchParams = {
  token_config: metadata,
  reference: new anchor.BN(Date.now() / 1000),
  nonce: 0,
};
```

The helper automatically:
- ✅ Validates name length (1-32 characters)
- ✅ Validates symbol length (1-10 characters)
- ✅ Trims whitespace from all fields
- ✅ Uppercases the symbol
- ✅ Ensures URI is provided

## ⚙️ Advanced Configuration

```typescript
const vertigo = await Vertigo.load({
  connection,
  wallet,
  network: "mainnet",

  // Custom program addresses
  programs: {
    amm: customAmmAddress,
    factory: customFactoryAddress,
  },

  // API configuration
  apiUrl: "https://api.vertigo.so",

  // Caching settings
  cache: {
    enabled: true,
    ttl: 60000, // 1 minute
  },

  // Transaction settings
  priority: {
    autoFee: true,
    baseFee: 1000,
    maxFee: 1000000,
  },
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
import { Vertigo } from "@vertigo-amm/vertigo-sdk";
const vertigo = await Vertigo.load({ connection, wallet });

// The old SDK is still available for backwards compatibility
import { VertigoSDK } from "@vertigo-amm/vertigo-sdk";
```

## 🔗 Network Support

| Network  | Status       | RPC Endpoint                        |
| -------- | ------------ | ----------------------------------- |
| Mainnet  | ✅ Supported | https://api.mainnet-beta.solana.com |
| Devnet   | ✅ Supported | https://api.devnet.solana.com       |
| Testnet  | ✅ Supported | https://api.testnet.solana.com      |
| Localnet | ✅ Supported | http://localhost:8899               |

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
