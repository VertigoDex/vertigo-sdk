# AMM Examples (Legacy SDK)

These examples use the legacy `VertigoSDK` class for direct AMM operations. They are intended for advanced users who need low-level control over pool creation and management.

## ⚠️ Note

For most use cases, we recommend using the new simplified API shown in the `quick-start/` and `trading/` examples.

## Examples

- `0-setup.ts` - Setup script for creating tokens and wallets
- `1-launch-pool.ts` - Launch a new liquidity pool
- `2-buy-tokens.ts` - Buy tokens from a pool
- `3-sell-tokens.ts` - Sell tokens to a pool
- `4-claim-royalties.ts` - Claim royalties from a pool

## Prerequisites

1. **Create a wallet:**
   ```bash
   solana-keygen new
   ```

2. **Fund your wallet (for devnet):**
   ```bash
   solana airdrop 2 --url devnet
   ```

3. **Create pool parameters file:**
   Create a JSON file with pool parameters (see `pool-params-example.json`)

## Usage

These examples are designed to be run in sequence:

```bash
# 1. Setup (creates mint, token accounts, etc.)
yarn tsx examples/amm/0-setup.ts --path-to-pool-params ./pool-params.json

# 2. Launch pool
yarn tsx examples/amm/1-launch-pool.ts \
  --path-to-token-wallet-authority ./token-wallet-authority.json \
  --token-wallet-address <TOKEN_WALLET_ADDRESS> \
  --mint-b <MINT_B_ADDRESS> \
  --path-to-pool-params ./pool-params.json

# 3. Buy tokens
yarn tsx examples/amm/2-buy-tokens.ts \
  --pool-owner <POOL_OWNER> \
  --mint-b <MINT_B_ADDRESS> \
  --amount 1000000000

# 4. Sell tokens
yarn tsx examples/amm/3-sell-tokens.ts \
  --pool-owner <POOL_OWNER> \
  --mint-b <MINT_B_ADDRESS> \
  --amount 1000000

# 5. Claim royalties
yarn tsx examples/amm/4-claim-royalties.ts \
  --pool-address <POOL_ADDRESS>
```

## Pool Parameters Example

Create a `pool-params.json` file:

```json
{
  "shift": "10000000000",
  "initialTokenBReserves": "1000000000",
  "feeParams": {
    "normalizationPeriod": "3600",
    "decay": 0.99,
    "royaltiesBps": 250,
    "privilegedSwapper": null,
    "reference": null
  }
}
```

## For Simpler Usage

If you're just looking to swap tokens or query pools, check out the simpler examples:
- `examples/quick-start/getting-started.ts` - Read-only operations
- `examples/quick-start/with-wallet.ts` - Basic wallet integration
- `examples/trading/simple-swap.ts` - Simple token swaps
