import { Command } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import fs from "node:fs";
import { VertigoSDK, getRpcUrl } from "../../../../src";
import {
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { wrapSol } from "../../utils";

const DEFAULT_WALLET_PATH = `${process.env.HOME}/.config/solana/id.json`;
const DEFAULT_NETWORK = "devnet";

interface BuyAnswers {
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

export const buyCommand = new Command("buy")
  .description("Buy tokens from an AMM pool")
  .action(async () => {
    const answers = await inquirer.prompt<BuyAnswers>([
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
        message: "Amount of SOL to spend:",
        validate: (input: number) => {
          return input > 0 || "Amount must be greater than 0";
        },
      },
      {
        type: "number",
        name: "limit",
        message: "Limit for the buy order (0 for no limit):",
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

      // If using native SOL, wrap it first
      if (answers.mintA === NATIVE_MINT.toString()) {
        let wSolBalance = 0;
        try {
          wSolBalance = await connection
            .getTokenAccountBalance(userTaA)
            .then((balance) => {
              return new anchor.BN(balance.value.amount).toNumber();
            });
        } catch (error) {
          // Token account doesn't exist, will be created during wrap
        }

        const balance = await connection.getBalance(user.publicKey);
        console.log(
          chalk.cyan("User SOL balance:"),
          balance / LAMPORTS_PER_SOL
        );
        console.log(chalk.cyan("User wSOL balance:"), wSolBalance);

        if (answers.amount > wSolBalance) {
          const difference = answers.amount - wSolBalance;
          if (balance + wSolBalance < answers.amount) {
            throw new Error(
              `Not enough SOL in wallet. Balance: ${balance}, required: ${answers.amount}`
            );
          }
          if (difference > 0) {
            console.log(chalk.yellow(`Wrapping ${difference} SOL to wSOL...`));
            await wrapSol(
              new anchor.AnchorProvider(connection, wallet, {}),
              difference,
              user.publicKey,
              user,
              null
            );
          }
        }
      }

      const signature = await vertigo.buy({
        owner: new PublicKey(answers.poolOwner),
        user,
        mintA: new PublicKey(answers.mintA),
        mintB: new PublicKey(answers.mintB),
        userTaA,
        userTaB,
        tokenProgramA: new PublicKey(answers.tokenProgramA),
        tokenProgramB: new PublicKey(answers.tokenProgramB),
        params: {
          amount: new anchor.BN(answers.amount),
          limit: new anchor.BN(answers.limit),
        },
      });

      console.log(chalk.green("\n✓ Buy transaction successful!"));
      console.log(chalk.cyan("Transaction Signature:"), signature);
    } catch (error) {
      console.error(chalk.red("\n✗ Failed to buy tokens:"), error);
      process.exit(1);
    }
  });
