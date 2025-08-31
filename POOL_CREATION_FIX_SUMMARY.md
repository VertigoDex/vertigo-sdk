# Pool Creation Fix Summary

## Issues Fixed

### 1. InvalidProgramId Error (Error Code: 0xbc0)
**Problem**: The `create` instruction was failing with `InvalidProgramId` for `token_program_a`.

**Solution**: 
- Added the missing `rent` sysvar account to the instruction's account list
- Corrected the account ordering to match the IDL specification exactly

### 2. ConstraintSeeds Error (Error Code: 0x7d6)
**Problem**: Vault PDA derivation was incorrect, causing a seeds constraint violation.

**Solution**:
- Fixed `PDADeriver.deriveVault()` to use correct seeds `[pool, mint]` instead of `['vault', pool, mint]`
- The vault PDAs should only use the pool and mint addresses as seeds, without a string prefix

### 3. InvalidShift Error (Error Code: 0x1777)
**Problem**: The AMM program requires shift to be greater than 0.

**Solution**:
- Changed `shift` parameter from `0` to `64` (representing 2^6)
- This is a standard shift value for the price curve

## Final Working Configuration

### Account List for Create Instruction
```typescript
[
  { pubkey: wallet.publicKey, isSigner: true, isWritable: true }, // payer
  { pubkey: wallet.publicKey, isSigner: true, isWritable: false }, // owner
  { pubkey: wallet.publicKey, isSigner: true, isWritable: false }, // token_wallet_authority
  { pubkey: mintA, isSigner: false, isWritable: false }, // mint_a
  { pubkey: mintB, isSigner: false, isWritable: false }, // mint_b
  { pubkey: tokenAccountB.address, isSigner: false, isWritable: true }, // token_wallet_b
  { pubkey: poolPda, isSigner: false, isWritable: true }, // pool
  { pubkey: vaultA, isSigner: false, isWritable: true }, // vault_a
  { pubkey: vaultB, isSigner: false, isWritable: true }, // vault_b
  { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // token_program_a
  { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // token_program_b
  { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
  { pubkey: RENT, isSigner: false, isWritable: false }, // rent (SysvarRent111111111111111111111111111111111)
]
```

### Create Parameters
```typescript
{
  shift: new anchor.BN(64), // Must be > 0
  initial_token_b_reserves: new anchor.BN(100 * 10**6), // 100 Token B with 6 decimals
  fee_params: {
    normalization_period: new anchor.BN(100),
    decay: 0.5,
    reference: new anchor.BN(0),
    royalties_bps: 100,
    privileged_swapper: null,
  }
}
```

## Test Results
✅ All 10 integration tests now pass successfully:
- Program Connectivity (5 tests)
- Pool Discovery
- Pool PDA Derivation
- Token Factories
- **Pool Initialization** (now working!)
- Swap Simulation

Pool creation is confirmed working on devnet with successful transaction execution.