import * as anchor from "@coral-xyz/anchor";
import { Keypair } from "@solana/web3.js";
import fs from "node:fs";
import os from "node:os";

export function loadLocalWallet() {
  const pathToWallet = `${os.homedir()}/.config/solana/id.json`;
  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(pathToWallet, "utf-8")))
  );
  const wallet = new anchor.Wallet(walletKeypair);
  return wallet;
}
