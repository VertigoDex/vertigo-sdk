import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import {
  createAssociatedTokenAccountInstruction,
  createSyncNativeInstruction,
  getAssociatedTokenAddress,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { SystemProgram, Transaction } from "@solana/web3.js";

export function getFactoryPda(
  owner: PublicKey,
  mintA: PublicKey,
  nonce: number,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("factory"),
      owner.toBuffer(),
      mintA.toBuffer(),
      Uint8Array.from([nonce]),
    ],
    programId
  );
}

export function getPoolPda(
  owner: PublicKey,
  mintA: PublicKey,
  mintB: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("pool"), owner.toBuffer(), mintA.toBuffer(), mintB.toBuffer()],
    programId
  );
}

export function getVaultPda(
  pool: PublicKey,
  mint: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [pool.toBuffer(), mint.toBuffer()],
    programId
  );
}

export async function fundSol(
  provider: anchor.AnchorProvider,
  account: PublicKey,
  amount: number
) {
  await provider.connection.requestAirdrop(account, amount);
}

export async function fundWsol(
  provider: anchor.AnchorProvider,
  account: PublicKey,
  amount: number
): Promise<PublicKey> {
  await fundSol(provider, provider.wallet.publicKey, amount);
  return await wrapSol(
    provider,
    amount,
    account,
    (provider.wallet as anchor.Wallet).payer,
    null
  );
}

export async function wrapSol(
  provider: anchor.AnchorProvider,
  amount: number,
  owner: PublicKey,
  payer: Keypair,
  wsolAta: PublicKey | null
): Promise<PublicKey> {
  // Get or create ATA for wSOL
  wsolAta =
    wsolAta ||
    (await getAssociatedTokenAddress(
      NATIVE_MINT,
      owner,
      false,
      TOKEN_PROGRAM_ID
    ));

  const instructions = [];

  // Check if ATA exists
  const account = await provider.connection.getAccountInfo(wsolAta);
  if (!account) {
    instructions.push(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        wsolAta,
        owner,
        NATIVE_MINT,
        TOKEN_PROGRAM_ID
      )
    );
  }

  // Add wrap instructions
  instructions.push(
    SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: wsolAta,
      lamports: amount,
    }),
    createSyncNativeInstruction(wsolAta, TOKEN_PROGRAM_ID)
  );

  // Send transaction
  const transaction = new Transaction().add(...instructions);
  await provider.sendAndConfirm(transaction, [payer]);

  return wsolAta;
}

// Helper function to get token balance
export async function getTokenBalance(
  provider: anchor.AnchorProvider,
  account: PublicKey
): Promise<anchor.BN> {
  return new anchor.BN(
    (await provider.connection.getTokenAccountBalance(account)).value.amount
  );
}

export async function getTxLogs(
  provider: anchor.AnchorProvider,
  txSignature: anchor.web3.TransactionSignature
) {
  // Get logs for this transaction
  const txInfo = await provider.connection.getTransaction(txSignature, {
    commitment: "confirmed",
  });

  if (!txInfo) {
    console.log("Transaction not found or not confirmed yet.");
    return;
  }

  return txInfo.meta?.logMessages;
}

// Helper function to log transaction info
export const logTx = (txHash: string, description: string) => {
  console.log(`Transaction: ${description}`);
  console.log(`https://explorer.solana.com/tx/${txHash}?cluster=custom`);
  console.log("---");
};
