import {
  PublicKey,
  Connection,
  Keypair,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createSyncNativeInstruction,
  createCloseAccountInstruction,
  getAssociatedTokenAddressSync,
  getAccount,
  getMint,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  NATIVE_MINT,
  createInitializeAccountInstruction,
} from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";

/**
 * Get or create associated token account
 */
export const getOrCreateATA = async (
  connection: Connection,
  mint: PublicKey,
  owner: PublicKey,
  payer: PublicKey,
  allowOwnerOffCurve: boolean = false
): Promise<{
  address: PublicKey;
  instruction?: TransactionInstruction;
}> => {
  const tokenProgram = await getTokenProgram(connection, mint);
  
  const ata = getAssociatedTokenAddressSync(
    mint,
    owner,
    allowOwnerOffCurve,
    tokenProgram
  );

  try {
    await getAccount(connection, ata, undefined, tokenProgram);
    return { address: ata };
  } catch (error) {
    // Account doesn't exist, create instruction
    const instruction = createAssociatedTokenAccountIdempotentInstruction(
      payer,
      ata,
      owner,
      mint,
      tokenProgram
    );
    
    return {
      address: ata,
      instruction,
    };
  }
};

/**
 * Determine token program for a mint
 */
export const getTokenProgram = async (
  connection: Connection,
  mint: PublicKey
): Promise<PublicKey> => {
  try {
    // Try to get mint with Token-2022 first
    await getMint(connection, mint, undefined, TOKEN_2022_PROGRAM_ID);
    return TOKEN_2022_PROGRAM_ID;
  } catch {
    // Fall back to regular token program
    return TOKEN_PROGRAM_ID;
  }
};

/**
 * Create wrapped SOL account
 */
export const createWrappedSolAccount = async (
  connection: Connection,
  owner: PublicKey,
  amount: number | anchor.BN,
  keypair?: Keypair
): Promise<{
  account: Keypair;
  instructions: TransactionInstruction[];
  cleanupInstructions: TransactionInstruction[];
}> => {
  const account = keypair || Keypair.generate();
  const lamports = typeof amount === "number" ? amount : amount.toNumber();

  const instructions: TransactionInstruction[] = [];
  
  // Create account
  const rentExemptBalance = await connection.getMinimumBalanceForRentExemption(165);
  
  instructions.push(
    SystemProgram.createAccount({
      fromPubkey: owner,
      newAccountPubkey: account.publicKey,
      lamports: rentExemptBalance + lamports,
      space: 165,
      programId: TOKEN_PROGRAM_ID,
    })
  );
  
  // Initialize account
  instructions.push(
    createInitializeAccountInstruction(
      account.publicKey,
      NATIVE_MINT,
      owner,
      TOKEN_PROGRAM_ID
    )
  );

  // Sync native account
  instructions.push(
    createSyncNativeInstruction(account.publicKey, TOKEN_PROGRAM_ID)
  );

  // Cleanup instructions
  const cleanupInstructions = [
    createCloseAccountInstruction(
      account.publicKey,
      owner,
      owner,
      [],
      TOKEN_PROGRAM_ID
    )
  ];

  return {
    account,
    instructions,
    cleanupInstructions,
  };
};

/**
 * Get token balance
 */
export const getTokenBalance = async (
  connection: Connection,
  tokenAccount: PublicKey,
  decimals?: number
): Promise<{
  raw: anchor.BN;
  ui: number;
  decimals: number;
}> => {
  try {
    const account = await getAccount(connection, tokenAccount);
    const tokenDecimals = decimals || 0;
    
    return {
      raw: new anchor.BN(account.amount.toString()),
      ui: Number(account.amount) / Math.pow(10, tokenDecimals),
      decimals: tokenDecimals,
    };
  } catch (error) {
    return {
      raw: new anchor.BN(0),
      ui: 0,
      decimals: decimals || 0,
    };
  }
};

/**
 * Get SOL balance
 */
export const getSolBalance = async (
  connection: Connection,
  address: PublicKey
): Promise<{
  raw: anchor.BN;
  ui: number;
}> => {
  const balance = await connection.getBalance(address);
  
  return {
    raw: new anchor.BN(balance),
    ui: balance / anchor.web3.LAMPORTS_PER_SOL,
  };
};

/**
 * Get token metadata (for Token-2022)
 */
export const getTokenMetadata = async (
  connection: Connection,
  mint: PublicKey
): Promise<{
  name?: string;
  symbol?: string;
  uri?: string;
  decimals: number;
  supply: anchor.BN;
} | null> => {
  try {
    const mintInfo = await getMint(connection, mint);
    
    // Basic mint info
    const metadata = {
      decimals: mintInfo.decimals,
      supply: new anchor.BN(mintInfo.supply.toString()),
    };

    // TODO: Fetch additional metadata from Metaplex or Token-2022 extensions
    
    return metadata;
  } catch (error) {
    console.error("Failed to fetch token metadata:", error);
    return null;
  }
};

/**
 * Calculate amount with slippage
 */
export const calculateAmountWithSlippage = (
  amount: anchor.BN,
  slippageBps: number,
  isMinimum: boolean = true
): anchor.BN => {
  const slippageMultiplier = isMinimum 
    ? 10000 - slippageBps 
    : 10000 + slippageBps;
    
  return amount.mul(new anchor.BN(slippageMultiplier)).div(new anchor.BN(10000));
};

/**
 * Format token amount for display
 */
export const formatTokenAmount = (
  amount: anchor.BN | number | string,
  decimals: number,
  displayDecimals: number = 4
): string => {
  const value = typeof amount === "string" || typeof amount === "number"
    ? new anchor.BN(amount.toString())
    : amount;

  const divisor = new anchor.BN(10).pow(new anchor.BN(decimals));
  const quotient = value.div(divisor);
  const remainder = value.mod(divisor);
  
  const decimalPart = remainder.toString().padStart(decimals, "0").slice(0, displayDecimals);
  
  return `${quotient.toString()}.${decimalPart}`;
};

/**
 * Parse token amount from string
 */
export const parseTokenAmount = (
  amount: string,
  decimals: number
): anchor.BN => {
  const parts = amount.split(".");
  const wholePart = parts[0] || "0";
  const decimalPart = (parts[1] || "").padEnd(decimals, "0").slice(0, decimals);
  
  const wholeAmount = new anchor.BN(wholePart).mul(
    new anchor.BN(10).pow(new anchor.BN(decimals))
  );
  const decimalAmount = new anchor.BN(decimalPart);
  
  return wholeAmount.add(decimalAmount);
};

/**
 * Check if mint is native SOL
 */
export const isNativeMint = (mint: PublicKey): boolean => {
  return mint.equals(NATIVE_MINT);
};

/**
 * Get all token accounts for owner
 */
export const getAllTokenAccounts = async (
  connection: Connection,
  owner: PublicKey,
  programId: PublicKey = TOKEN_PROGRAM_ID
): Promise<Array<{
  pubkey: PublicKey;
  mint: PublicKey;
  amount: anchor.BN;
}>> => {
  const accounts = await connection.getParsedTokenAccountsByOwner(owner, {
    programId,
  });

  return accounts.value.map((account) => ({
    pubkey: account.pubkey,
    mint: new PublicKey(account.account.data.parsed.info.mint),
    amount: new anchor.BN(account.account.data.parsed.info.tokenAmount.amount),
  }));
};