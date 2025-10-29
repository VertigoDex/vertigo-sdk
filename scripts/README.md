# Vertigo SDK Scripts

## Create Pool with $DIZZY as Quote Asset

⚠️ **IMPORTANT: This script runs on MAINNET and uses REAL SOL!**

This script demonstrates how to create a NEW/DIZZY pool on Vertigo mainnet.

### What it does:

1. **Creates a new token** - Generates a new SPL token with 9 decimals
2. **Mints initial supply** - Creates 1 trillion tokens
3. **Creates a Vertigo pool** - Sets up a pool with $DIZZY as the quote asset (instead of SOL)
4. **Tests the pool** - Gets a quote to verify the pool is working

### Requirements:

- `DEVNET_PRIVATE_KEY` environment variable set with your wallet private key (base58 encoded)
  - ⚠️ Note: Despite the name, this will be used on **MAINNET**
- **Sufficient SOL in your mainnet wallet** (at least 0.5-1 SOL)
  - Creating a token mint: ~0.00144 SOL (rent-exempt)
  - Creating pool: ~0.01-0.05 SOL (varies)
  - Transaction fees: ~0.00005 SOL per transaction

### Usage:

⚠️ **DOUBLE CHECK**: Make sure you understand this uses **REAL SOL on MAINNET**!

```bash
# Set your private key (will be used on MAINNET!)
export DEVNET_PRIVATE_KEY="your_base58_private_key_here"

# Run the script
yarn experiment:dizzy-pool
```

Or run directly with tsx:

```bash
DEVNET_PRIVATE_KEY="your_key" tsx scripts/create-pool-with-dizzy.ts
```

### Safety Tips:

- ✅ Test with a wallet that only has the exact amount you're willing to spend
- ✅ Verify your wallet address and balance before running
- ✅ Understand that token creation and pool setup are permanent on mainnet
- ❌ Don't use your main wallet without understanding the risks

### Pool Configuration:

- **Base token**: Newly created token (1T supply)
- **Quote token**: $DIZZY (`DiZZY2UQ2HSVsFDF6jADc6YYATiTfnQFw4Be1udRZmaY`)
- **Initial market cap**: 10B base units (adjustable in script)
- **Trading fee**: 2.5% (250 bps)
- **Network**: 🔴 **MAINNET** (uses real funds!)

### Output:

The script will output:

- New token mint address
- Pool address
- Transaction signature
- Quote example (1 DIZZY → X tokens)
- Solana explorer link

### Customization:

You can modify these parameters in the script:

```typescript
const initialSupply = 1_000_000_000_000; // Total token supply
const initialTokenReserves = 1_000_000_000_000; // Tokens in pool
const initialMarketCap = 10_000_000_000; // Starting market cap
const royaltiesBps = 250; // Trading fee (2.5%)
```

### Notes:

- The pool uses **$DIZZY as the quote asset**, meaning:
  - Users buy your token WITH $DIZZY
  - Users sell your token FOR $DIZZY
  - Trading fees accumulate in $DIZZY

- This is different from typical pools that use SOL or USDC as the quote asset

- 🔴 **The pool is created on MAINNET using REAL funds**
  - This is NOT a test environment
  - Transactions are permanent and irreversible
  - Use at your own risk

### Why Mainnet?

The v3 SDK is new and the devnet program hasn't been updated yet. The mainnet program is compatible with SDK v3.
