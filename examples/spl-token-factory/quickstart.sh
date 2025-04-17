#!/bin/bash

# SPL Token Factory Quickstart Script
# This script automates all steps from the SPL Token Factory README

set -e  # Exit on error

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo "Error: bun is not installed or not in your PATH"
    echo "Please install bun and try again"
    exit 1
fi

# Check if solana-cli is installed
if ! command -v solana &> /dev/null; then
    echo "Error: solana-cli is not installed or not in your PATH"
    echo "Please install solana-cli and try again"
    exit 1
fi

# Default values
NETWORK="localnet"
PAYER_PATH="$HOME/.config/solana/id.json"
OWNER_PATH="$HOME/.config/solana/id.json"
FACTORY_PARAMS_PATH="../config/factoryInit.json"
LAUNCH_CONFIG_PATH="../config/factoryLaunch.json"

# Print banner
echo "================================================"
echo "      SPL Token Factory Quickstart Script       "
echo "================================================"
echo ""

# Make sure dependencies are installed
echo "Installing dependencies..."
bun install
echo "Dependencies installed successfully"
echo ""

# Step 1: Initialize the Token Factory
echo "Step 1: Initializing the Token Factory..."
if ! bun run ./1-initialize.ts \
    --network $NETWORK \
    --path-to-payer $PAYER_PATH \
    --path-to-owner $OWNER_PATH \
    --path-to-factory-params $FACTORY_PARAMS_PATH; then
    echo "Account already initialized, continuing..."
    # Sleep briefly to ensure initialization is complete
    sleep 2
else
    echo "Token Factory initialized successfully"
fi
echo ""



# Step 2: Launch a new token
echo "Step 2: Launching a new token..."
LAUNCH_OUTPUT=$(bun run ./2-launch-from-factory.ts \
    --network $NETWORK \
    --path-to-payer $PAYER_PATH \
    --path-to-owner $OWNER_PATH \
    --launch-config $LAUNCH_CONFIG_PATH)

echo "$LAUNCH_OUTPUT"

# Parse the mint address and pool address from the output
# This assumes the output format contains lines with "mint address:" and "pool address:"
MINT_ADDRESS=$(echo "$LAUNCH_OUTPUT" | grep -i "mint address:" | awk '{print $NF}')
POOL_ADDRESS=$(echo "$LAUNCH_OUTPUT" | grep -i "pool address:" | awk '{print $NF}')

# Check if we successfully extracted the addresses
if [ -z "$MINT_ADDRESS" ]; then
    echo "Error: Failed to extract mint address from output"
    exit 1
fi

if [ -z "$POOL_ADDRESS" ]; then
    echo "Error: Failed to extract pool address from output"
    exit 1
fi

echo "Extracted mint address: $MINT_ADDRESS"
echo "Extracted pool address: $POOL_ADDRESS"

# Get the pool owner address (your wallet)
if [ "$NETWORK" = "localnet" ]; then
    POOL_OWNER_ADDRESS=$(solana address --url http://localhost:8899)
else
    POOL_OWNER_ADDRESS=$(solana address --url $NETWORK)
fi
echo "Pool owner address: $POOL_OWNER_ADDRESS"
echo ""

# Wait a bit for the transaction to be confirmed
echo "Waiting for transaction confirmation..."
sleep 5
echo ""

# Step 3: Buy tokens
echo "Step 3: Buying tokens..."
bun run ./3-buy-tokens.ts \
    --network $NETWORK \
    --path-to-user $PAYER_PATH \
    --pool-owner $POOL_OWNER_ADDRESS \
    --mint-b $MINT_ADDRESS \
    --amount 1000000000
echo "Tokens purchased successfully"
echo ""

# Wait a bit for the transaction to be confirmed
echo "Waiting for transaction confirmation..."
sleep 5
echo ""

# Step 4: Sell tokens
echo "Step 4: Selling tokens..."
bun run ./4-sell-tokens.ts \
    --network $NETWORK \
    --path-to-user $PAYER_PATH \
    --pool-owner $POOL_OWNER_ADDRESS \
    --mint-b $MINT_ADDRESS \
    --amount 1000 \
    --limit 0.001
echo "Tokens sold successfully"
echo ""

# Wait a bit for the transaction to be confirmed
echo "Waiting for transaction confirmation..."
sleep 5
echo ""

# Step 5: Claim royalties
echo "Step 5: Claiming royalties..."
bun run ./5-claim-royalties.ts \
    --network $NETWORK \
    --path-to-claimer $PAYER_PATH \
    --pool $POOL_ADDRESS
echo "Royalties claimed successfully"
echo ""

echo "================================================"
echo "      All steps completed successfully!         "
echo "================================================"
echo ""
echo "Token Details:"
echo "  Mint Address: $MINT_ADDRESS"
echo "  Pool Address: $POOL_ADDRESS"
echo "  Pool Owner:   $POOL_OWNER_ADDRESS"
echo ""
echo "You can now use these addresses in other commands"
echo "or export them to your environment:"
echo ""
echo "export MINT_ADDRESS=$MINT_ADDRESS"
echo "export POOL_ADDRESS=$POOL_ADDRESS"
echo "export POOL_OWNER_ADDRESS=$POOL_OWNER_ADDRESS" 