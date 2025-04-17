import { Command } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";
import { Connection, Keypair } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import fs from "node:fs";
import { VertigoSDK, getRpcUrl } from "../../../../src";
import { NATIVE_MINT } from "@solana/spl-token";

const DEFAULT_WALLET_PATH = `${process.env.HOME}/.config/solana/id.json`;
const DEFAULT_NETWORK = "devnet";

// Helper function to format large numbers with underscores
const formatLargeNumber = (num: string): string => {
  return num.replace(/\B(?=(\d{3})+(?!\d))/g, "_");
};

interface FactoryAnswers {
  network: string;
  walletPath: string;
  shift: string;
  initialTokenReserves: string;
  normalizationPeriod: number;
  decay: number;
  royaltiesBps: number;
  decimals: number;
  mutable: boolean;
  nonce: number;
}

export const initCommand = new Command("init")
  .description("Initialize a new token factory")
  .action(async () => {
    const answers = await inquirer.prompt([
      {
        type: "list",
        name: "network",
        message:
          "Select network (The Solana network where the factory will be deployed):",
        default: DEFAULT_NETWORK,
        choices: ["mainnet-beta", "devnet", "testnet", "localnet"],
      },
      {
        type: "input",
        name: "walletPath",
        message:
          "Path to your wallet keypair file (The file containing your Solana wallet's keypair):",
        default: DEFAULT_WALLET_PATH,
        validate: (input: string) => {
          try {
            if (fs.existsSync(input)) {
              return true;
            }
            return "Wallet file does not exist";
          } catch (error) {
            return "Invalid path";
          }
        },
      },
      {
        type: "list",
        name: "factoryType",
        message: "Select factory type:",
        default: 1,
        choices: [
          { name: "SPL Token Factory", value: 1 },
          { name: "Token-2022 Factory", value: 2 },
        ],
      },

      {
        type: "input",
        name: "shift",
        message: `Enter shift value (Affects price curve, default: ${formatLargeNumber(
          "100000000000"
        )}):\n  Note: This parameter affects the price curve of the token`,
        default: "100000000000",
        validate: (input: string) => {
          const num = Number(input);
          return !Number.isNaN(num) || "Please enter a valid number";
        },
      },
      {
        type: "input",
        name: "initialTokenReserves",
        message: `Enter initial token reserves (Initial pool liquidity, default: ${formatLargeNumber(
          "1000000000000000"
        )}):\n  Note: This sets the initial liquidity in the pool`,
        default: "1000000000000000",
        validate: (input: string) => {
          const num = Number(input);
          return !Number.isNaN(num) || "Please enter a valid number";
        },
      },
      {
        type: "number",
        name: "normalizationPeriod",
        message:
          "Enter normalization period (Time period in slots for fee normalization, default: 10):",
        default: 10,
        validate: (input: number) =>
          !Number.isNaN(input) || "Please enter a valid number",
      },
      {
        type: "number",
        name: "decay",
        message:
          "Enter decay rate (Rate at which fees decay over time, 1.0 = no decay, default: 1.0):",
        default: 1.0,
        validate: (input: number) =>
          !Number.isNaN(input) || "Please enter a valid number",
      },
      {
        type: "number",
        name: "royaltiesBps",
        message:
          "Enter royalties in basis points (Fee percentage where 100 bps = 1%, default: 50):",
        default: 50,
        validate: (input: number) =>
          (!Number.isNaN(input) && input >= 0 && input <= 10000) ||
          "Please enter a valid number between 0 and 10000",
      },
      {
        type: "number",
        name: "decimals",
        message:
          "Enter token decimals (Number of decimal places, e.g. 6 for USDC or 9 for SOL, default: 6):",
        default: 6,
        validate: (input: number) =>
          (!Number.isNaN(input) && input >= 0 && input <= 9) ||
          "Please enter a valid number between 0 and 9",
      },
      {
        type: "confirm",
        name: "mutable",
        message:
          "Should the token be mutable? (If yes, token metadata can be updated after creation)",
        default: true,
      },
      {
        type: "number",
        name: "nonce",
        message:
          "Enter nonce value (Unique identifier for factory instance - cannot create two factories with same nonce, default: 0):",
        default: 0,
        validate: (input: number) =>
          (!Number.isNaN(input) && Number.isInteger(input) && input >= 0) ||
          "Please enter a valid non-negative integer",
      },
    ] as const);

    try {
      // Load wallet
      const payer = Keypair.fromSecretKey(
        Buffer.from(JSON.parse(fs.readFileSync(answers.walletPath, "utf-8")))
      );
      const wallet = new anchor.Wallet(payer);

      // Connect to network
      const connection = new Connection(
        getRpcUrl(answers.network),
        "confirmed"
      );
      const vertigo = new VertigoSDK(connection, wallet);

      // Format large numbers for display
      const displayParams = {
        ...answers,
        shift: formatLargeNumber(answers.shift),
        initialTokenReserves: formatLargeNumber(answers.initialTokenReserves),
      };

      // Prepare factory parameters
      const factoryParams = {
        shift: new anchor.BN(answers.shift),
        initialTokenReserves: new anchor.BN(answers.initialTokenReserves),
        feeParams: {
          normalizationPeriod: new anchor.BN(answers.normalizationPeriod),
          decay: answers.decay,
          royaltiesBps: answers.royaltiesBps,
        },
        tokenParams: {
          decimals: answers.decimals,
          mutable: answers.mutable,
        },
        nonce: answers.nonce,
      };

      console.log(chalk.blue("\nInitializing factory with parameters:"));
      console.log(chalk.cyan("Network:"), answers.network);
      console.log(chalk.cyan("Wallet:"), answers.walletPath);
      console.log(
        chalk.cyan("Parameters:"),
        JSON.stringify(displayParams, null, 2)
      );

      const factory =
        answers.factoryType === 1
          ? vertigo.SPLTokenFactory
          : vertigo.Token2022Factory;

      const signature = await factory.initialize({
        payer: wallet.payer,
        owner: wallet.payer,
        mintA: NATIVE_MINT,
        params: factoryParams,
      });

      console.log(chalk.green("\n✓ Factory initialized successfully!"));
      console.log(chalk.cyan("Transaction signature:"), signature);
    } catch (error) {
      console.error(chalk.red("\n✗ Failed to initialize factory:"), error);
      process.exit(1);
    }
  });
