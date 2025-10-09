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

const TEST_TIMEOUT = 120_000;

describe("E2E Integration Tests (Devnet)", () => {
  let connection: Connection;
  let vertigo: VertigoClient;
  let owner: Keypair;

  beforeAll(async () => {
    connection = setupConnection();

    if (process.env.DEVNET_PRIVATE_KEY) {
      try {
        const privateKeyBytes = anchor.utils.bytes.bs58.decode(
          process.env.DEVNET_PRIVATE_KEY
        );
        owner = Keypair.fromSecretKey(privateKeyBytes);
      } catch (error) {
        owner = Keypair.generate();
      }
    } else {
      owner = Keypair.generate();
    }

    try {
      const balance = await connection.getBalance(owner.publicKey);
      if (balance < LAMPORTS_PER_SOL) {
        await fundWallet(connection, owner.publicKey);
      }
    } catch (error) {
      console.warn("Failed to fund wallet:", error);
    }

    vertigo = await VertigoClient.load({
      connection,
      network: "devnet",
      wallet: new anchor.Wallet(owner),
    });
  }, TEST_TIMEOUT);

  describe("Client Setup", () => {
    it("should initialize client with wallet", () => {
      expect(vertigo).toBeDefined();
      expect(vertigo.wallet).toBeDefined();
      expect(vertigo.wallet?.publicKey.equals(owner.publicKey)).toBe(true);
    });
  });

  describe("Swap Operations", () => {
    it("should have swap method available", () => {
      expect(typeof vertigo.swap).toBe("function");
    });
  });

  describe("Create Operations", () => {
    it("should have create method available", () => {
      expect(typeof vertigo.create).toBe("function");
    });
  });

  describe("Claim Operations", () => {
    it("should have claim method available", () => {
      expect(typeof vertigo.claim).toBe("function");
    });
  });
});
