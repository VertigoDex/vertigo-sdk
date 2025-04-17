import { Command } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import fs from "node:fs";
import { VertigoSDK, getRpcUrl } from "../../../../src";
import {
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";

const DEFAULT_WALLET_PATH = `${process.env.HOME}/.config/solana/id.json`;
const DEFAULT_NETWORK = "devnet";

interface ClaimAnswers {
  network: string;
  pathToClaimer: string;
  poolAddress: string;
  mintA: string;
  tokenProgramA: string;
  receiverMintATokenAccount?: string;
}

export const claimCommand = new Command("claim")
  .description("Claim royalties from an AMM pool")
  .action(async () => {
    const answers = await inquirer.prompt<ClaimAnswers>([
      {
        type: "list",
        name: "network",
        message: "Select network:",
        default: DEFAULT_NETWORK,
        choices: ["mainnet-beta", "devnet", "testnet", "localnet"],
      },
      {
        type: "input",
        name: "pathToClaimer",
        message: "Path to claimer keypair file:",
        default: DEFAULT_WALLET_PATH,
        validate: (input: string) => {
          try {
            if (fs.existsSync(input)) return true;
            return "File does not exist";
          } catch (error) {
            return "Invalid path";
          }
        },
      },
      {
        type: "input",
        name: "poolAddress",
        message: "Pool address:",
        validate: (input: string) => {
          try {
            new PublicKey(input);
            return true;
          } catch {
            return "Invalid public key";
          }
        },
      },
      {
        type: "input",
        name: "mintA",
        message: "Mint A address (press Enter for Native SOL):",
        default: NATIVE_MINT.toString(),
        validate: (input: string) => {
          try {
            new PublicKey(input);
            return true;
          } catch {
            return "Invalid public key";
          }
        },
      },
      {
        type: "input",
        name: "tokenProgramA",
        message: "Token program A address (press Enter for default SPL Token):",
        default: TOKEN_PROGRAM_ID.toString(),
        validate: (input: string) => {
          try {
            new PublicKey(input);
            return true;
          } catch {
            return "Invalid public key";
          }
        },
      },
      {
        type: "input",
        name: "receiverMintATokenAccount",
        message:
          "Receiver mint A token account (optional, press Enter to use default):",
        validate: (input: string) => {
          if (!input) return true;
          try {
            new PublicKey(input);
            return true;
          } catch {
            return "Invalid public key";
          }
        },
      },
    ]);

    try {
      // Connect to network
      const connection = new Connection(
        getRpcUrl(answers.network),
        "confirmed"
      );

      // Load claimer keypair
      const claimer = Keypair.fromSecretKey(
        Buffer.from(JSON.parse(fs.readFileSync(answers.pathToClaimer, "utf-8")))
      );
      const wallet = new anchor.Wallet(claimer);

      const vertigo = new VertigoSDK(connection, wallet);

      let receiverTaA: PublicKey;
      if (answers.receiverMintATokenAccount) {
        receiverTaA = new PublicKey(answers.receiverMintATokenAccount);
      } else {
        receiverTaA = getAssociatedTokenAddressSync(
          new PublicKey(answers.mintA),
          claimer.publicKey,
          false,
          new PublicKey(answers.tokenProgramA)
        );
      }

      const signature = await vertigo.claimRoyalties({
        pool: new PublicKey(answers.poolAddress),
        claimer,
        mintA: new PublicKey(answers.mintA),
        receiverTaA,
        tokenProgramA: new PublicKey(answers.tokenProgramA),
      });

      console.log(chalk.green("\n✓ Royalties claimed successfully!"));
      console.log(chalk.cyan("Transaction Signature:"), signature);
    } catch (error) {
      console.error(chalk.red("\n✗ Failed to claim royalties:"), error);
      process.exit(1);
    }
  });
