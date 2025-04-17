import * as anchor from "@coral-xyz/anchor";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountInstruction,
  createSyncNativeInstruction,
  getAssociatedTokenAddress,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

export async function wrapSol(
  provider: anchor.AnchorProvider,
  amount: number,
  owner: PublicKey,
  payer: Keypair,
  wsolAta: PublicKey | null
): Promise<PublicKey> {
  // Get or create ATA for wSOL
  const tokenAccount =
    wsolAta ||
    (await getAssociatedTokenAddress(
      NATIVE_MINT,
      owner,
      false,
      TOKEN_PROGRAM_ID
    ));

  const instructions = [];

  // Check if ATA exists
  const account = await provider.connection.getAccountInfo(tokenAccount);
  if (!account) {
    instructions.push(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        tokenAccount,
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
      toPubkey: tokenAccount,
      lamports: amount,
    }),
    createSyncNativeInstruction(tokenAccount, TOKEN_PROGRAM_ID)
  );

  // Send transaction
  const transaction = new Transaction().add(...instructions);
  await provider.sendAndConfirm(transaction, [payer]);

  return tokenAccount;
}
