# Running the AMM Examples

## Steps

The following is a guide for interacting with the AMM methods on the vertigo SDK.

### Prerequisites

Make sure to install the dependencies for the project by running `bun install`.

1. Setup
   This script will create a token wallet authority, mint, and token wallet. It will also mint tokens to the token wallet. These are required to launch a pool. If path to required keypairs are not provided, the script will generate new keypairs and save them to the current directory.

```
bun run ./0-setup.ts \
    --network devnet \
    --path-to-owner ~/.config/solana/id.json \
    --path-to-user ~/.config/solana/id.json \
    --path-to-pool-params ../config/poolParams.json
```

The script will output a **mint address** and **token wallet address**. Add them to the following command to store them as environment variables for the following steps.

```
export MINT_B_ADDRESS=
export TOKEN_WALLET_ADDRESS=
```

2. Launch a pool
   If you used the default arguments, the token wallet authority, mint, and token wallet will be generated in the current directory.

```
bun run ./1-launch-pool.ts \
   --network devnet \
   --path-to-payer ~/.config/solana/id.json \
   --path-to-owner ~/.config/solana/id.json \
   --path-to-user ~/.config/solana/id.json \
   --path-to-token-wallet-authority ./token-wallet-authority.json \
   --token-wallet-address $TOKEN_WALLET_ADDRESS \
   --mint-b $MINT_B_ADDRESS \
   --path-to-pool-params ../config/poolParams.json \

```

This will output a **pool address**. Add it to the following command to store it as an environment variable for the following steps.

```
export POOL_ADDRESS=
```

3. Buy tokens

```

bun run ./2-buy-tokens.ts \
   --network devnet \
   --pool-owner $POOL_OWNER_ADDRESS \
   --path-to-user ~/.config/solana/id.json \
   --mint-b $MINT_B_ADDRESS \
   --amount 1000000000 \
   --limit 0

```

4. Sell tokens

```
bun run ./3-sell-tokens.ts \
   --network devnet \
   --pool-owner $POOL_OWNER_ADDRESS \
   --path-to-user ~/.config/solana/id.json \
   --mint-b $MINT_B_ADDRESS \
   --amount 10000 \
   --limit 0

```

5. Claim royalties
   The owner of the pool can claim the royalties from the pool. Royalties can be sent to any token account for the mintA.

```

bun run ./4-claim-royalties.ts \
 --network devnet \
 --path-to-claimer ~/.config/solana/id.json \
 --pool-address $POOL_ADDRESS \

```
