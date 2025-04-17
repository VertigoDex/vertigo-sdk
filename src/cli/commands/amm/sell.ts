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
const DECIMALS = 6;

interface SellAnswers {
  network: string;
  pathToUser: string;
  poolOwner: string;
  mintA: string;
  mintB: string;
  tokenProgramA: string;
  tokenProgramB: string;
  amount: number;
  limit: number;
}

export const sellCommand = new Command("sell")
  .description("Sell tokens to an AMM pool")
  .action(async () => {
    const answers = await inquirer.prompt<SellAnswers>([
      {
        type: "list",
        name: "network",
        message: "Select network:",
        default: DEFAULT_NETWORK,
        choices: ["mainnet-beta", "devnet", "testnet", "localnet"],
      },
      {
        type: "input",
        name: "pathToUser",
        message: "Path to user keypair file:",
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
        name: "poolOwner",
        message: "Pool owner address:",
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
        name: "mintB",
        message: "Mint B address:",
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
        name: "tokenProgramB",
        message: "Token program B address (press Enter for default SPL Token):",
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
        type: "number",
        name: "amount",
        message: "Amount of tokens to sell:",
        validate: (input: number) => {
          return input > 0 || "Amount must be greater than 0";
        },
      },
      {
        type: "number",
        name: "limit",
        message: "Limit for the sell order (0 for no limit):",
        default: 0,
      },
    ]);

    try {
      // Connect to network
      const connection = new Connection(
        getRpcUrl(answers.network),
        "confirmed"
      );

      // Load user keypair
      const user = Keypair.fromSecretKey(
        Buffer.from(JSON.parse(fs.readFileSync(answers.pathToUser, "utf-8")))
      );
      const wallet = new anchor.Wallet(user);

      const vertigo = new VertigoSDK(connection, wallet);

      // Get token accounts
      const userTaA = getAssociatedTokenAddressSync(
        new PublicKey(answers.mintA),
        user.publicKey,
        false,
        new PublicKey(answers.tokenProgramA)
      );

      const userTaB = getAssociatedTokenAddressSync(
        new PublicKey(answers.mintB),
        user.publicKey,
        false,
        new PublicKey(answers.tokenProgramB)
      );

      const signature = await vertigo.sell({
        owner: new PublicKey(answers.poolOwner),
        user,
        mintA: new PublicKey(answers.mintA),
        mintB: new PublicKey(answers.mintB),
        userTaA,
        userTaB,
        tokenProgramA: new PublicKey(answers.tokenProgramA),
        tokenProgramB: new PublicKey(answers.tokenProgramB),
        params: {
          amount: new anchor.BN(Number(answers.amount) * 10 ** DECIMALS),
          limit: new anchor.BN(answers.limit),
        },
      });

      console.log(chalk.green("\n✓ Sell transaction successful!"));
      console.log(chalk.cyan("Transaction Signature:"), signature);
    } catch (error) {
      console.error(chalk.red("\n✗ Failed to sell tokens:"), error);
      process.exit(1);
    }
  });
