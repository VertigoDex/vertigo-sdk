#!/bin/bash

# AMM Quickstart Script
# This script automates all steps from the AMM README

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
OWNER_PATH="$HOME/.config/solana/id.json"
USER_PATH="$HOME/.config/solana/id.json"
PAYER_PATH="$HOME/.config/solana/id.json"
POOL_PARAMS_PATH="../config/poolParams.json"
OWNER_ADDRESS=$(solana address)

# Print banner
echo "================================================"
echo "            AMM Quickstart Script              "
echo "================================================"
echo ""

# Make sure dependencies are installed
echo "Installing dependencies..."
bun install
echo "Dependencies installed successfully"
echo ""

# Step 1: Setup - Create token wallet authority, mint, and token wallet
echo "Step 1: Running setup..."
SETUP_OUTPUT=$(bun run ./0-setup.ts \
    --network $NETWORK \
    --path-to-owner $OWNER_PATH \
    --path-to-user $USER_PATH \
    --path-to-pool-params $POOL_PARAMS_PATH)

echo "$SETUP_OUTPUT"

# Parse the mint address and token wallet address from the output
# This assumes the output format contains lines with "mint address:" and "token wallet address:"
MINT_B_ADDRESS=$(echo "$SETUP_OUTPUT" | grep -i "mint address:" | awk '{print $NF}')
TOKEN_WALLET_ADDRESS=$(echo "$SETUP_OUTPUT" | grep -i "token wallet address:" | awk '{print $NF}')

# Check if we successfully extracted the addresses
if [ -z "$MINT_B_ADDRESS" ]; then
    echo "Error: Failed to extract mint address from output"
    exit 1
fi

if [ -z "$TOKEN_WALLET_ADDRESS" ]; then
    echo "Error: Failed to extract token wallet address from output"
    exit 1
fi

echo "Extracted mint address: $MINT_B_ADDRESS"
echo "Extracted token wallet address: $TOKEN_WALLET_ADDRESS"
echo ""

# Wait a bit for the transaction to be confirmed
echo "Waiting for transaction confirmation..."
sleep 5
echo ""

# Step 2: Launch a pool
echo "Step 2: Launching a pool..."
LAUNCH_OUTPUT=$(bun run ./1-launch-pool.ts \
    --network $NETWORK \
    --path-to-payer $PAYER_PATH \
    --path-to-owner $OWNER_PATH \
    --path-to-user $USER_PATH \
    --path-to-token-wallet-authority ./token-wallet-authority.json \
    --token-wallet-address $TOKEN_WALLET_ADDRESS \
    --mint-b $MINT_B_ADDRESS \
    --path-to-pool-params $POOL_PARAMS_PATH)

echo "$LAUNCH_OUTPUT"

# Parse the pool address from the output
# This assumes the output format contains a line with "pool address:"
POOL_ADDRESS=$(echo "$LAUNCH_OUTPUT" | grep -i "pool address:" | awk '{print $NF}')

# Check if we successfully extracted the pool address
if [ -z "$POOL_ADDRESS" ]; then
    echo "Error: Failed to extract pool address from output"
    exit 1
fi

echo "Extracted pool address: $POOL_ADDRESS"
echo ""

# Wait a bit for the transaction to be confirmed
echo "Waiting for transaction confirmation..."
sleep 5
echo ""

# Step 3: Buy tokens
echo "Step 3: Buying tokens..."
bun run ./2-buy-tokens.ts \
    --network $NETWORK \
    --pool-owner $OWNER_ADDRESS \
    --path-to-user $USER_PATH \
    --mint-b $MINT_B_ADDRESS \
    --amount 1000000000 \
    --limit 0
echo "Tokens purchased successfully"
echo ""

# Wait a bit for the transaction to be confirmed
echo "Waiting for transaction confirmation..."
sleep 5
echo ""

# Step 4: Sell tokens
echo "Step 4: Selling tokens..."
bun run ./3-sell-tokens.ts \
    --network $NETWORK \
    --pool-owner $OWNER_ADDRESS \
    --path-to-user $USER_PATH \
    --mint-b $MINT_B_ADDRESS \
    --amount 10000 \
    --limit 0
echo "Tokens sold successfully"
echo ""

# Wait a bit for the transaction to be confirmed
echo "Waiting for transaction confirmation..."
sleep 5
echo ""

# Step 5: Claim royalties
echo "Step 5: Claiming royalties..."
bun run ./4-claim-royalties.ts \
    --network $NETWORK \
    --path-to-claimer $OWNER_PATH \
    --pool-address $POOL_ADDRESS
echo "Royalties claimed successfully"
echo ""

echo "================================================"
echo "      All steps completed successfully!         "
echo "================================================"
echo ""
echo "Summary of Created Resources:"
echo "  Mint B Address:        $MINT_B_ADDRESS"
echo "  Token Wallet Address:  $TOKEN_WALLET_ADDRESS"
echo "  Pool Address:          $POOL_ADDRESS"
echo ""
echo "You can export these addresses to your environment:"
echo ""
echo "export MINT_B_ADDRESS=$MINT_B_ADDRESS"
echo "export TOKEN_WALLET_ADDRESS=$TOKEN_WALLET_ADDRESS"
echo "export POOL_ADDRESS=$POOL_ADDRESS" 