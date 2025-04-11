# Quickstart Guide for SPL Token Factory

## Introduction

This guide walks you through creating and managing your own SPL token on Solana using our token factory using default flag values:

1. Initialize a token factory
2. Launch a new token
3. Buy and sell tokens
4. Claim royalties as the token creator

Before you begin, make sure your local Solana environment is set up and funded. If you need to fund your wallet you can use `solana airdrop <num sol>`.

## Step-by-Step Commands

### 1. Initialize the Token Factory

This creates your token factory that can launch multiple tokens

```bash
bun run ./1-initialize.ts \
    --network devnet \
    --path-to-payer ~/.config/solana/id.json \
    --path-to-owner ~/.config/solana/id.json \
    --path-to-factory-params ../config/factoryInit.json
```

### 2. Launch Your Token

Creates your new SPL token with customized parameters

```bash
bun run ./2-launch-from-factory.ts \
    --network devnet \
    --path-to-payer ~/.config/solana/id.json \
    --path-to-owner ~/.config/solana/id.json \
    --launch-config ../config/factoryLaunch.json
```

The above command will output output a **pool address** and **mint address** - save them for the next steps.
Run the following command to export the mint address to an environment variable to be used in the next steps

```bash
export MINT_ADDRESS=
export POOL_OWNER_ADDRESS=$(solana address)
export POOL_ADDRESS=
```

### 3. Buy Tokens

Buy your newly created token from the pool. If Mint A is SOL, the script will automatically fund your Mint A token account with wSOL so you can buy the Mint B token.

Note the pool owner address is the public address of the owner of the pool. In this example, you are the pool owner, so you can use your own address.

```bash
bun run ./3-buy-tokens.ts \
    --network devnet \
    --path-to-user ~/.config/solana/id.json \
    --pool-owner $POOL_OWNER_ADDRESS \
    --mint-b $MINT_ADDRESS \
    --amount 1
```

### 4. Sell Tokens

Sell your tokens back for SOL. Again since you are the pool owner, you can use your own address for pool-owner.

```bash
bun run ./4-sell-tokens.ts \
    --network devnet \
    --path-to-user ~/.config/solana/id.json \
    --pool-owner $POOL_OWNER_ADDRESS \
    --mint-b $MINT_ADDRESS \
    --amount 1000 \
    --limit 0.001
```

### 5. Claim Royalties

Token creators can collect their accumulated royalties. The script below will claim the royalties for the pool owner, which is your local wallet. In this example, POOL_ADDRESS is the address of the pool you created in step 2.

```bash
bun run ./5-claim-royalties.ts \
    --network devnet \
    --path-to-claimer ~/.config/solana/id.json \
    --pool $POOL_ADDRESS
```

## Next steps

The examples above are the simplest way to interact with Vertigo's token factory. Below are some ideas for how you can customize the token factory and tokens to your liking:

### Customize the token params and metadata

You can customize the paramters used to initialize and launch tokens by modifying the `factoryInit.json` and `factoryLaunch.json` files in the `config` directory.

### Customize the token accounts

You can customize which accounts are used to interact with tokens by modifying the flags in the various scripts.

### Claim royalties to a different address

You can send royalties to a different address by modifying the `receiver-mint-a-token-account` flag in the `5-claim-royalties.ts` script.

## Full customization with the SDK

For more advanced usage and full customization you can use the Vertigo SDK directly.
