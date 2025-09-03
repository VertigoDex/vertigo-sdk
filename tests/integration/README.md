# Vertigo SDK v2 Integration Tests

This directory contains comprehensive integration tests for the Vertigo SDK v2 that run against real Solana networks (primarily devnet).

## Overview

Unlike unit tests that use mocks, these integration tests interact with actual blockchain infrastructure to ensure the SDK works correctly in real-world conditions.

## Test Files

- **config.ts** - Configuration and utilities for devnet testing
- **VertigoClient.integration.test.ts** - Tests for the main client
- **SwapClient.integration.test.ts** - Swap functionality tests
- **PoolClient.integration.test.ts** - Pool operations tests
- **test-runner.ts** - Comprehensive CLI test runner
- **test-runner.html** - Browser-based test interface

## Running Tests

### Prerequisites

1. Install dependencies:

```bash
yarn install
```

2. Set up a devnet wallet (optional):

```bash
# Generate a new keypair
solana-keygen new --outfile devnet-wallet.json

# Request airdrop
solana airdrop 2 <your-pubkey> --url devnet
```

3. Configure environment (optional):

```bash
# Create .env file with your devnet private key
echo "DEVNET_PRIVATE_KEY=your-base58-private-key" > .env
```

### Running with Vitest

Run all integration tests:

```bash
yarn test:integration
```

Run specific test file:

```bash
yarn vitest run tests/integration/SwapClient.integration.test.ts
```

### Running with CLI Test Runner

The CLI test runner provides a comprehensive testing experience with detailed output and reporting.

#### Basic Usage

Run all tests on devnet:

```bash
yarn test:devnet
```

Run with verbose output:

```bash
yarn test:devnet:verbose
```

Export results to JSON:

```bash
yarn test:devnet:export
```

#### Advanced Options

Run specific category:

```bash
tsx tests/integration/test-runner.ts test --category PoolClient
```

Use specific RPC endpoint:

```bash
tsx tests/integration/test-runner.ts test --rpc https://api.devnet.solana.com
```

Use specific keypair:

```bash
tsx tests/integration/test-runner.ts test --keypair ./devnet-wallet.json
```

Request airdrop before testing:

```bash
tsx tests/integration/test-runner.ts test --airdrop
```

View all options:

```bash
yarn test:devnet:help
```

### Running in Browser

Open the HTML test runner for an interactive testing experience:

```bash
# Serve the HTML file (requires a local server)
npx serve tests/integration

# Then open http://localhost:3000/test-runner.html
```

The browser interface provides:

- Visual test results
- Real-time console output
- Test categorization
- Result export functionality

## Test Categories

Tests are organized into the following categories:

### 1. **VertigoClient**

- Client initialization
- Sub-client availability
- Program loading
- Network configuration

### 2. **PoolClient**

- Pool discovery
- Pool information retrieval
- TVL calculations
- Price calculations
- Liquidity operations

### 3. **SwapClient**

- Quote calculation
- Route finding
- Transaction building
- Slippage handling
- Error scenarios

### 4. **FactoryClient**

- Factory state retrieval
- Token metadata validation
- Launch cost calculations
- Token creation (simulation)

### 5. **VertigoAPI**

- Health checks
- Token price fetching
- Pool statistics
- Historical data

### 6. **Liquidity**

- Add liquidity calculations
- Remove liquidity calculations
- Transaction building

### 7. **Transactions**

- Transaction simulation
- Fee estimation
- Error handling

## Environment Variables

```bash
# Required for authenticated operations
DEVNET_PRIVATE_KEY=your-base58-private-key

# Optional configuration
RPC_ENDPOINT=https://api.devnet.solana.com
NETWORK=devnet
```

## Test Results

Test results can be exported in JSON format for further analysis:

```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "network": "devnet",
  "wallet": "...",
  "summary": {
    "total": 50,
    "passed": 48,
    "failed": 1,
    "skipped": 1
  },
  "results": [...]
}
```

## Troubleshooting

### Common Issues

1. **Rate Limiting**
   - Tests include delays between operations
   - Use custom RPC endpoint if needed

2. **Insufficient Balance**
   - Request airdrop with `--airdrop` flag
   - Or manually: `solana airdrop 2 <pubkey> --url devnet`

3. **No Pools Available**
   - Some tests require existing pools on devnet
   - Tests will skip gracefully if pools unavailable

4. **Transaction Simulation Failures**
   - Expected on devnet due to missing accounts
   - Tests verify transaction structure, not execution

### Debug Mode

Enable verbose output for detailed debugging:

```bash
tsx tests/integration/test-runner.ts test --verbose
```

## Writing New Tests

To add new integration tests:

1. Create test file in `tests/integration/`
2. Import test utilities from `config.ts`
3. Follow naming convention: `*.integration.test.ts`
4. Add to appropriate test suite in `test-runner.ts`

Example test structure:

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import { setupConnection, setupWallet, DEVNET_CONFIG } from "./config";

describe("MyFeature Integration Tests", () => {
  let connection: Connection;
  let wallet: Keypair;

  beforeAll(async () => {
    connection = setupConnection();
    wallet = setupWallet();
  }, DEVNET_CONFIG.TIMEOUTS.TEST);

  it("should perform operation", async () => {
    // Your test implementation
  });
});
```

## CI/CD Integration

For GitHub Actions or other CI systems:

```yaml
- name: Run Integration Tests
  run: |
    echo "${{ secrets.DEVNET_PRIVATE_KEY }}" > .env
    yarn test:devnet --export results.json
  env:
    DEVNET_PRIVATE_KEY: ${{ secrets.DEVNET_PRIVATE_KEY }}
```

## Performance Benchmarks

Expected test execution times on devnet:

- Full suite: 2-5 minutes
- Per category: 15-30 seconds
- Individual test: 100-2000ms

## Contributing

When adding new SDK features:

1. Write unit tests with mocks
2. Add integration tests for real network validation
3. Update this README if adding new test categories
4. Ensure tests pass on devnet before submitting PR
