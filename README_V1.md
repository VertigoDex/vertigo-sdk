# Vertigo

<div align="center">
  <img src="assets/vertigo-logo.png" alt="Vertigo Logo" width="200"/>
  <h3>The New Meta for Fair Token Launches on Solana</h3>
</div>

## Overview

Vertigo revolutionizes token launches on Solana with a focus on fairness, simplicity, and transparency. Our innovative AMM design eliminates common launch problems like sniping and liquidity requirements, while providing a seamless experience for both creators and traders.

📚 **[Read the full documentation](https://vertigo.gitbook.io/vertigo-docs)** to learn more about Vertigo's features and capabilities.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Getting Started](#getting-started)
  - [Installation](#installation)
  - [Usage with Next.js](#usage-with-nextjs)
  - [Quick Start](#quick-start)
- [Examples](#examples)
- [Configuration](#configuration)

## Key Features

### 🛡️ Advanced Snipe Protection

- Innovative fee mechanism that penalizes early snipers
- Creates a fair playing field for human traders
- Automatic fee decay system post-launch

### 💧 Zero Initial Liquidity Required

- Launch at any market cap without locking SOL or USDC
- Single-sided token deposits
- No liquidity burn requirements
- Innovative price discovery mechanism

### 🚀 Simple Launch Process

Launch your token in three simple steps:

1. Set your desired initial market cap
2. Configure your fee structure
3. Set your launch time

### 🔒 Built-in Safety Features

- Permanent liquidity locking
- Transparent fee structures
- Visible dev transactions
- Immutable pool parameters after creation

### 💰 Customizable Economics

- Configurable initial market cap
- Flexible fee structures
- Permanent royalty system
- Dynamic pool behavior with static implementation

## Getting Started

### Installation

```bash
npm install @vertigo-amm/vertigo-sdk
# or
yarn add @vertigo-amm/vertigo-sdk
# or
bun install @vertigo-amm/vertigo-sdk
```

### Examples

This repo contains examples for interacting with the AMM and Factory programs via the SDK. To run the examples, navigate to the directory you are interested in and copy the code snippets in the README.md file into your terminal.
The examples are designed to work out of the box, but you can customize them to fit your needs.

- [AMM](./examples/amm/README.md)
- [Token 2022 Factory](./examples/token-2022-factory/README.md)
- [SPL Token Factory](./examples/spl-token-factory/README.md)

### Configuration

The SDK can be configured with the following options:

```typescript
interface SDKConfig {
  // Log level for operations, defaults to "verbose"
  logLevel?: "verbose" | "tx" | "none";

  // Explorer to use for transaction links, defaults to "solanaExplorer
  explorer?: "solscan" | "solanaExplorer";
}
```

### Troubleshooting

#### Next.js bundling issues with Anchor

If you encounter issues with Next.js bundling, you can try the following:

```typescript
experimental: {
  serverComponentsExternalPackages: ["@coral-xyz/anchor"],
},
```

#### Issues importing Wallet from Anchor

If you encounter issues importing Wallet from Anchor, you can try the following to import it as a default export:

```typescript
import Wallet from "@coral-xyz/anchor/dist/esm/nodewallet.js";
```
