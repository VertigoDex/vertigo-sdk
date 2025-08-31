# Token Factory Removal & Pool Authority Integration

## Summary
Removed deprecated SPL Token Factory and Token-2022 Factory support from the SDK, replacing them with a separate Pool Authority client module for advanced users.

## Changes Made

### 1. Removed Token Factories
- **Deleted Files:**
  - `src/client/FactoryClient.ts` - Entire factory client removed
  
- **Updated Files:**
  - `src/core/constants.ts` - Removed `SPL_TOKEN_FACTORY` and `TOKEN_2022_FACTORY` addresses
  - `src/client/VertigoClient.ts` - Removed factory program initialization and client
  - `src/types/client.ts` - Removed factory program references from config types
  - `tests/integration/full-integration.test.ts` - Replaced factory tests with Pool Authority tests
  - `tests/integration/direct-program-utils.ts` - Removed `deriveFactory()` method

### 2. Added Pool Authority Client
- **New File:** `src/client/PoolAuthorityClient.ts`
  - Standalone client for Pool Authority program
  - Separate from main SDK to avoid confusion
  - Includes methods for:
    - Creating pool authorities
    - Updating authority settings
    - Transferring ownership
    - Checking authority status
    - Listing authorities for an owner

### 3. Updated SDK Exports
- **Main exports remain simple:**
  ```typescript
  import { Vertigo } from '@vertigo/sdk';  // Regular users
  ```
  
- **Pool Authority is separate:**
  ```typescript
  import { PoolAuthority } from '@vertigo/sdk';  // Advanced users only
  ```

## Migration Guide

### For Regular Users
No changes needed. The main Vertigo SDK works the same:
```typescript
const client = await Vertigo.load({ connection, wallet });
await client.pools.findAll();
await client.swap.getQuote(...);
```

### For Factory Users
Token factories are deprecated. The factory functionality is available in the separate `vertigo-factory` repository for reference, but is no longer supported in the main SDK.

### For Pool Authority Users
```typescript
import { PoolAuthority } from '@vertigo/sdk';

const poolAuth = await PoolAuthority.load({ 
  connection, 
  wallet,
  network: 'devnet' 
});

// Check if wallet has authority
const hasAuth = await poolAuth.hasAuthority(wallet.publicKey);

// Create new authority
const { signature, authority } = await poolAuth.createAuthority({
  owner: wallet.publicKey,
  feeRecipient: wallet.publicKey,
  defaultFeeRate: 30,
});
```

## Benefits
1. **Cleaner API** - Removes deprecated functionality
2. **Less Confusion** - Pool Authority is clearly separated for advanced users
3. **Smaller Bundle** - Reduced code size without factory clients
4. **Better Maintenance** - Focused on core AMM functionality

## Test Results
All integration tests pass with the new structure:
- ✅ AMM Connectivity
- ✅ Pool Authority Connectivity  
- ✅ Permissioned Relay Connectivity
- ✅ Pool Discovery
- ✅ Pool PDA Derivation
- ✅ Pool Authority Tests (NEW)
- ✅ Pool Initialization
- ✅ Swap Simulation