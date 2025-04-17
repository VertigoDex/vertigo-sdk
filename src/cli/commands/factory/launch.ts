import { Command } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import fs from "node:fs";
import { VertigoSDK, getRpcUrl } from "../../../../src";
import { NATIVE_MINT, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";

const DEFAULT_WALLET_PATH = `${process.env.HOME}/.config/solana/id.json`;
const DEFAULT_NETWORK = "devnet";

interface LaunchAnswers {
  network: string;
  walletPath: string;
  factoryType: number;
  tokenName: string;
  tokenSymbol: string;
  tokenUri: string;
  mintBOption: "generate" | "existing";
  mintBPath?: string;
  mintBAuthorityOption: "wallet" | "separate";
  mintBAuthorityPath?: string;
  privilegedSwapper: string;
  nonce: number;
}

export const launchCommand = new Command("launch")
  .description("Launch a new token from a factory")
  .action(async () => {
    const answers = await inquirer.prompt<LaunchAnswers>([
      {
        type: "list",
        name: "network",
        message:
          "Select network (The Solana network where the token will be launched):",
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
        name: "tokenName",
        message: "Enter token name:",
        validate: (input: string) =>
          input.length > 0 || "Token name is required",
      },
      {
        type: "input",
        name: "tokenSymbol",
        message: "Enter token symbol:",
        validate: (input: string) =>
          input.length > 0 || "Token symbol is required",
      },
      {
        type: "input",
        name: "tokenUri",
        message:
          "Enter token metadata URI or leave empty (e.g., https://arweave.net/abc123.json):",
        default: "",
        validate: (input: string) => {
          if (!input) return true; // Allow empty input
          try {
            new URL(input);
            return true;
          } catch {
            return "Please enter a valid URL or leave empty";
          }
        },
      },
      {
        type: "list",
        name: "mintBOption",
        message:
          "How would you like to handle Mint B (the token being created)?",
        choices: [
          { name: "Generate new keypair (recommended)", value: "generate" },
          { name: "Provide existing keypair file", value: "existing" },
        ],
      },
      {
        type: "input",
        name: "mintBPath",
        message: "Enter path to Mint B keypair file:",
        when: (answers) => answers.mintBOption === "existing",
        validate: (input: string) => {
          try {
            if (fs.existsSync(input)) {
              return true;
            }
            return "Keypair file does not exist";
          } catch (error) {
            return "Invalid path";
          }
        },
      },
      {
        type: "list",
        name: "mintBAuthorityOption",
        message: "How would you like to handle Mint B Authority?",
        choices: [
          { name: "Use wallet as authority (recommended)", value: "wallet" },
          { name: "Provide separate authority keypair", value: "separate" },
        ],
      },
      {
        type: "input",
        name: "mintBAuthorityPath",
        message: "Enter path to Mint B Authority keypair file:",
        when: (answers) => answers.mintBAuthorityOption === "separate",
        validate: (input: string) => {
          try {
            if (fs.existsSync(input)) {
              return true;
            }
            return "Keypair file does not exist";
          } catch (error) {
            return "Invalid path";
          }
        },
      },
      {
        type: "input",
        name: "privilegedSwapper",
        message:
          "Enter privileged swapper address (optional, press Enter to skip):",
        validate: (input: string) => {
          if (!input) return true;
          try {
            new PublicKey(input);
            return true;
          } catch {
            return "Please enter a valid Solana address";
          }
        },
      },
      {
        type: "number",
        name: "nonce",
        message:
          "Enter factory nonce (must match the nonce used during factory initialization):",
        default: 0,
        validate: (input: number) =>
          (!Number.isNaN(input) && Number.isInteger(input) && input >= 0) ||
          "Please enter a valid non-negative integer",
      },
    ] as const);

    try {
      // Connect to network
      const connection = new Connection(
        getRpcUrl(answers.network),
        "confirmed"
      );

      // Load wallet
      const payer = Keypair.fromSecretKey(
        Buffer.from(JSON.parse(fs.readFileSync(answers.walletPath, "utf-8")))
      );
      const wallet = new anchor.Wallet(payer);

      const vertigo = new VertigoSDK(connection, wallet);

      // Create or load Mint B
      const mintB =
        answers.mintBOption === "generate"
          ? Keypair.generate()
          : Keypair.fromSecretKey(
              Buffer.from(
                JSON.parse(fs.readFileSync(answers.mintBPath, "utf-8"))
              )
            );

      // Create or use wallet as Mint B Authority
      const mintBAuthority =
        answers.mintBAuthorityOption === "wallet"
          ? wallet.payer
          : answers.mintBAuthorityPath
          ? Keypair.fromSecretKey(
              Buffer.from(
                JSON.parse(fs.readFileSync(answers.mintBAuthorityPath, "utf-8"))
              )
            )
          : wallet.payer;

      // If generating a new mint, create and initialize it
      if (answers.mintBOption === "generate") {
        console.log(chalk.blue("\nCreating new mint..."));

        // Create the mint
        await createMint(
          connection,
          payer,
          mintBAuthority.publicKey,
          null,
          6,
          TOKEN_PROGRAM_ID,
          undefined,
          mintB
        );
        console.log(chalk.cyan("Mint address:"), mintB.publicKey.toBase58());

        // Create associated token account for the mint authority
        const tokenWallet = await getOrCreateAssociatedTokenAccount(
          connection,
          payer,
          mintB.publicKey,
          mintBAuthority.publicKey,
          TOKEN_PROGRAM_ID
        );
        console.log(
          chalk.cyan("Token wallet address:"),
          tokenWallet.toString()
        );
      }

      const launchConfig = {
        tokenConfig: {
          name: answers.tokenName,
          symbol: answers.tokenSymbol,
          uri: answers.tokenUri,
        },
        privilegedSwapper: answers.privilegedSwapper
          ? new PublicKey(answers.privilegedSwapper)
          : null,
        reference: new anchor.BN(0),
        nonce: answers.nonce,
      };

      console.log(chalk.blue("\nLaunching token with parameters:"));
      console.log(chalk.cyan("Network:"), answers.network);
      console.log(chalk.cyan("Token Name:"), answers.tokenName);
      console.log(chalk.cyan("Token Symbol:"), answers.tokenSymbol);
      console.log(chalk.cyan("Token URI:"), answers.tokenUri);
      console.log(chalk.cyan("Mint B Public Key:"), mintB.publicKey.toBase58());
      console.log(
        chalk.cyan("Mint B Authority:"),
        mintBAuthority.publicKey.toBase58()
      );
      if (answers.privilegedSwapper) {
        console.log(
          chalk.cyan("Privileged Swapper:"),
          answers.privilegedSwapper
        );
      }

      const factory =
        answers.factoryType === 1
          ? vertigo.SPLTokenFactory
          : vertigo.Token2022Factory;

      const { signature, poolAddress } = await factory.launch({
        payer: wallet.payer,
        owner: wallet.payer,
        mintA: NATIVE_MINT,
        mintB,
        mintBAuthority,
        tokenProgramA: TOKEN_PROGRAM_ID,
        params: launchConfig,
      });

      console.log(chalk.green("\n✓ Token launched successfully!"));
      console.log(chalk.cyan("Transaction Signature:"), signature);
      console.log(chalk.cyan("Pool Address:"), poolAddress.toBase58());
      console.log(
        chalk.cyan("Token Mint Address:"),
        mintB.publicKey.toBase58()
      );

      // Save mint B keypair if it was generated
      if (answers.mintBOption === "generate") {
        const mintBKeypairPath = `mint-${mintB.publicKey.toBase58()}.json`;
        fs.writeFileSync(
          mintBKeypairPath,
          JSON.stringify(Array.from(mintB.secretKey))
        );
        console.log(
          chalk.yellow("\nNOTE: Generated Mint B keypair saved to:"),
          mintBKeypairPath
        );
      }
    } catch (error) {
      console.error(chalk.red("\n✗ Failed to launch token:"), error);
      process.exit(1);
    }
  });
