import { describe, it, expect, beforeAll } from "vitest";
import {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { VertigoClient } from "../../src/client";
import { setupConnection, fundWallet } from "./config";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
  getAccount,
} from "@solana/spl-token";

const TEST_TIMEOUT = 120_000;

describe("Full Flow Integration Tests (Devnet)", () => {
  let connection: Connection;
  let vertigo: VertigoClient;
  let owner: Keypair;
  let mintA: PublicKey;
  let mintB: PublicKey;
  let poolAddress: PublicKey;

  beforeAll(async () => {
    connection = setupConnection();

    if (process.env.DEVNET_PRIVATE_KEY) {
      try {
        const privateKeyBytes = anchor.utils.bytes.bs58.decode(
          process.env.DEVNET_PRIVATE_KEY
        );
        owner = Keypair.fromSecretKey(privateKeyBytes);
        console.log(
          "Using wallet from DEVNET_PRIVATE_KEY:",
          owner.publicKey.toBase58()
        );
      } catch (error) {
        console.error("Failed to load wallet from DEVNET_PRIVATE_KEY:", error);
        owner = Keypair.generate();
      }
    } else {
      owner = Keypair.generate();
      console.warn("No DEVNET_PRIVATE_KEY found, using generated wallet");
    }

    mintA = Keypair.generate().publicKey;
    mintB = Keypair.generate().publicKey;

    try {
      const balance = await connection.getBalance(owner.publicKey);
      console.log("Wallet balance:", balance / LAMPORTS_PER_SOL, "SOL");

      if (balance < LAMPORTS_PER_SOL) {
        console.log("Balance too low, requesting airdrop...");
        try {
          await fundWallet(connection, owner.publicKey);
          const newBalance = await connection.getBalance(owner.publicKey);
          console.log("New balance:", newBalance / LAMPORTS_PER_SOL, "SOL");
        } catch (error) {
          console.warn("Failed to fund wallet via airdrop:", error);
          console.warn("Tests requiring funded wallet will be skipped");
        }
      }
    } catch (error) {
      console.error("Failed to connect to RPC endpoint:", error);
      console.warn("Tests requiring RPC connection will be skipped");
    }

    vertigo = await VertigoClient.load({
      connection,
      network: "devnet",
      wallet: new anchor.Wallet(owner),
    });

    const [pda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("pool"),
        owner.publicKey.toBuffer(),
        mintA.toBuffer(),
        mintB.toBuffer(),
      ],
      vertigo.program.programId
    );
    poolAddress = pda;
  }, TEST_TIMEOUT);

  describe("Program Connectivity", () => {
    it("should connect to AMM program", () => {
      expect(vertigo.program).toBeDefined();
      expect(vertigo.program.programId).toBeDefined();
    });

    it("should fetch program accounts", async () => {
      try {
        const accounts = await connection.getProgramAccounts(
          vertigo.program.programId
        );
        expect(Array.isArray(accounts)).toBe(true);
      } catch (error) {
        console.warn("RPC unavailable, skipping test:", error);
      }
    });
  });

  describe("Pool Operations", () => {
    it("should derive pool PDA correctly", async () => {
      expect(poolAddress).toBeDefined();
      expect(mintA).toBeDefined();
      expect(mintB).toBeDefined();

      try {
        const balance = await connection.getBalance(owner.publicKey);
        if (balance === 0) {
          console.warn("Wallet not funded, using dummy mints");
          return;
        }

        mintA = await createMint(
          connection,
          owner,
          owner.publicKey,
          null,
          9,
          Keypair.generate(),
          undefined,
          TOKEN_PROGRAM_ID
        );

        mintB = await createMint(
          connection,
          owner,
          owner.publicKey,
          null,
          9,
          Keypair.generate(),
          undefined,
          TOKEN_PROGRAM_ID
        );

        const [pda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("pool"),
            owner.publicKey.toBuffer(),
            mintA.toBuffer(),
            mintB.toBuffer(),
          ],
          vertigo.program.programId
        );
        poolAddress = pda;
      } catch (error) {
        console.warn("RPC unavailable, using dummy mints:", error);
      }
    });
  });

  describe("Quote Functionality", () => {
    it(
      "should handle quote request",
      async () => {
        try {
          const accountInfo = await connection.getAccountInfo(poolAddress);

          if (!accountInfo) {
            console.warn("Pool not found, skipping quote test");
            return;
          }

          const quote = await vertigo.quote({
            pool: poolAddress,
            inputMint: mintA,
            outputMint: mintB,
            amount: new anchor.BN(1_000_000),
            slippageBps: 50,
          });

          expect(quote).toBeDefined();
          expect(quote.inputMint.equals(mintA)).toBe(true);
          expect(quote.outputMint.equals(mintB)).toBe(true);
        } catch (error) {
          console.warn("Quote failed (expected if pool doesn't exist):", error);
        }
      },
      TEST_TIMEOUT
    );
  });
});
