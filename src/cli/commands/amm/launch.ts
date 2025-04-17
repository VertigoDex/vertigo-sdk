import { Command } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import fs from "node:fs";
import {
  VertigoSDK,
  getRpcUrl,
  parseJsonOrThrow,
  validateLaunchParams,
} from "../../../../src";
import { NATIVE_MINT, TOKEN_PROGRAM_ID } from "@solana/spl-token";

const DEFAULT_WALLET_PATH = `${process.env.HOME}/.config/solana/id.json`;
const DEFAULT_NETWORK = "devnet";

interface LaunchAnswers {
  network: string;
  pathToPayer: string;
  pathToOwner: string;
  pathToUser: string;
  generateTokenWalletAuthority: boolean;
  pathToTokenWalletAuthority?: string;
  generateTokenWallet: boolean;
  tokenWalletAddress?: string;
  mintA: string;
  mintB: string;
  tokenProgramA: string;
  tokenProgramB: string;
  pathToPoolParams: string;
  devBuy: boolean;
  devTaA?: string;
  devTaB?: string;
  devBuyAmount?: number;
  devBuyLimit?: number;
}

export const launchCommand = new Command("launch")
  .description("Launch a new AMM pool")
  .action(async () => {
    const answers = await inquirer.prompt<LaunchAnswers>([
      {
        type: "list",
        name: "network",
        message: "Select network:",
        default: DEFAULT_NETWORK,
        choices: ["mainnet-beta", "devnet", "testnet", "localnet"],
      },
      {
        type: "input",
        name: "pathToPayer",
        message: "Path to payer keypair file:",
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
        name: "pathToOwner",
        message: "Path to owner keypair file:",
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
        type: "confirm",
        name: "generateTokenWalletAuthority",
        message: "Generate new token wallet authority keypair?",
        default: true,
      },
      {
        type: "input",
        name: "pathToTokenWalletAuthority",
        message: "Path to token wallet authority keypair file:",
        when: (answers) => !answers.generateTokenWalletAuthority,
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
        type: "confirm",
        name: "generateTokenWallet",
        message: "Generate new token wallet?",
        default: true,
      },
      {
        type: "input",
        name: "tokenWalletAddress",
        message: "Token wallet address:",
        when: (answers) => !answers.generateTokenWallet,
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
        type: "input",
        name: "pathToPoolParams",
        message: "Path to pool params JSON file:",
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
        type: "confirm",
        name: "devBuy",
        message: "Would you like to perform a dev buy?",
        default: false,
      },
      {
        type: "input",
        name: "devTaA",
        message: "Dev SOL token account address:",
        when: (answers) => answers.devBuy,
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
        name: "devTaB",
        message: "Dev custom token account address:",
        when: (answers) => answers.devBuy,
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
        name: "devBuyAmount",
        message: "Amount of Mint A to spend in the dev buy:",
        when: (answers) => answers.devBuy,
        validate: (input: number) => {
          return input > 0 || "Amount must be greater than 0";
        },
      },
      {
        type: "number",
        name: "devBuyLimit",
        message: "Limit for the dev buy order:",
        when: (answers) => answers.devBuy,
        default: 0,
      },
    ]);

    try {
      // Connect to network
      const connection = new Connection(
        getRpcUrl(answers.network),
        "confirmed"
      );

      // Load keypairs
      const wallet = new anchor.Wallet(
        Keypair.fromSecretKey(
          Buffer.from(JSON.parse(fs.readFileSync(answers.pathToPayer, "utf-8")))
        )
      );
      const owner = Keypair.fromSecretKey(
        Buffer.from(JSON.parse(fs.readFileSync(answers.pathToOwner, "utf-8")))
      );
      const user = Keypair.fromSecretKey(
        Buffer.from(JSON.parse(fs.readFileSync(answers.pathToUser, "utf-8")))
      );

      // Generate or load token wallet authority
      let tokenWalletAuthority: Keypair;
      if (answers.generateTokenWalletAuthority) {
        tokenWalletAuthority = Keypair.generate();
        // Save the keypair
        const tokenWalletAuthorityPath = `token-wallet-authority-${tokenWalletAuthority.publicKey.toBase58()}.json`;
        fs.writeFileSync(
          tokenWalletAuthorityPath,
          JSON.stringify(Array.from(tokenWalletAuthority.secretKey))
        );
        console.log(
          chalk.yellow("\nGenerated token wallet authority keypair saved to:"),
          tokenWalletAuthorityPath
        );
      } else if (answers.pathToTokenWalletAuthority) {
        tokenWalletAuthority = Keypair.fromSecretKey(
          Buffer.from(
            JSON.parse(
              fs.readFileSync(answers.pathToTokenWalletAuthority, "utf-8")
            )
          )
        );
      } else {
        throw new Error(
          "Token wallet authority path is required when not generating"
        );
      }

      // Generate or use provided token wallet
      let tokenWalletB: PublicKey;
      if (answers.generateTokenWallet) {
        const tokenWallet = Keypair.generate();
        tokenWalletB = tokenWallet.publicKey;
        // Save the keypair
        const tokenWalletPath = `token-wallet-${tokenWalletB.toBase58()}.json`;
        fs.writeFileSync(
          tokenWalletPath,
          JSON.stringify(Array.from(tokenWallet.secretKey))
        );
        console.log(
          chalk.yellow("\nGenerated token wallet keypair saved to:"),
          tokenWalletPath
        );
      } else if (answers.tokenWalletAddress) {
        tokenWalletB = new PublicKey(answers.tokenWalletAddress);
      } else {
        throw new Error("Token wallet address is required when not generating");
      }

      const vertigo = new VertigoSDK(connection, wallet);

      // Read and parse pool params
      const rawPoolParams = parseJsonOrThrow(answers.pathToPoolParams);

      // Convert raw values to proper types
      const poolParams = {
        shift: new anchor.BN(rawPoolParams.shift),
        initialTokenBReserves: new anchor.BN(
          rawPoolParams.initialTokenBReserves
        ),
        feeParams: {
          normalizationPeriod: new anchor.BN(
            rawPoolParams.feeParams.normalizationPeriod
          ),
          decay: rawPoolParams.feeParams.decay,
          royaltiesBps: rawPoolParams.feeParams.royaltiesBps,
          privilegedSwapper: rawPoolParams.feeParams.privilegedSwapper
            ? new PublicKey(rawPoolParams.feeParams.privilegedSwapper)
            : undefined,
          reference: rawPoolParams.feeParams.reference
            ? new anchor.BN(rawPoolParams.feeParams.reference)
            : undefined,
        },
      };

      // Validate the converted params
      validateLaunchParams(poolParams);

      const launchArgs = {
        params: poolParams,
        payer: wallet.payer,
        owner,
        tokenWalletAuthority,
        tokenWalletB,
        mintA: new PublicKey(answers.mintA),
        mintB: new PublicKey(answers.mintB),
        tokenProgramA: new PublicKey(answers.tokenProgramA),
        tokenProgramB: new PublicKey(answers.tokenProgramB),
      };

      if (
        answers.devBuy &&
        answers.devTaA &&
        answers.devTaB &&
        answers.devBuyAmount
      ) {
        Object.assign(launchArgs, {
          amount: new anchor.BN(answers.devBuyAmount),
          limit: new anchor.BN(answers.devBuyLimit || 0),
          devTaA: new PublicKey(answers.devTaA),
          dev: user,
        });
      }

      const { deploySignature, poolAddress } = await vertigo.launchPool(
        launchArgs
      );

      console.log(chalk.green("\n✓ Pool launched successfully!"));
      console.log(chalk.cyan("Transaction Signature:"), deploySignature);
      console.log(chalk.cyan("Pool Address:"), poolAddress.toBase58());

      // Save pool info to ~/.vertigo/pools.json
      const poolInfo = {
        poolAddress: poolAddress.toBase58(),
        mintA: answers.mintA,
        mintB: answers.mintB,
        tokenWalletB: tokenWalletB.toBase58(),
        tokenWalletAuthority: tokenWalletAuthority.publicKey.toBase58(),
        owner: owner.publicKey.toBase58(),
        timestamp: new Date().toISOString(),
      };

      const vertigoDir = `${process.env.HOME}/.vertigo`;
      const poolsFile = `${vertigoDir}/pools.json`;

      // Create directory if it doesn't exist
      if (!fs.existsSync(vertigoDir)) {
        fs.mkdirSync(vertigoDir);
      }

      // Read existing pools or create empty array
      let pools = [];
      try {
        pools = JSON.parse(fs.readFileSync(poolsFile, "utf-8"));
      } catch (error) {
        // File doesn't exist or is invalid, start with empty array
      }

      // Add new pool info and save
      pools.unshift(poolInfo); // Add to beginning of array
      fs.writeFileSync(poolsFile, JSON.stringify(pools, null, 2));
    } catch (error) {
      console.error(chalk.red("\n✗ Failed to launch pool:"), error);
      process.exit(1);
    }
  });
