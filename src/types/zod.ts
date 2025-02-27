import { z } from "zod";
import { PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";

// Schema for validating launchFromFactory() parameters and response
export const LaunchFromFactorySchema = z.object({
  // Input parameters
  payer: z.instanceof(anchor.web3.Keypair, {
    message: "Payer must be a valid Keypair",
  }),
  owner: z.instanceof(anchor.web3.Keypair, {
    message: "Owner must be a valid Keypair",
  }),
  mint: z.instanceof(anchor.web3.Keypair, {
    message: "Mint must be a valid Keypair",
  }),
  mintAuthority: z.instanceof(anchor.web3.Keypair, {
    message: "Mint authority must be a valid Keypair",
  }),
  royaltiesOwner: z.instanceof(anchor.web3.PublicKey, {
    message: "Royalties owner must be a valid PublicKey",
  }),
  launchCfg: z.object({
    name: z.string().min(1),
    symbol: z.string().min(1),
    uri: z.string().url(),
    feeFreebuys: z.number().int().nonnegative(),
  }),
  devBuyAmount: z.instanceof(anchor.BN).optional(),
  dev: z.instanceof(anchor.web3.Keypair).optional(),

  // Response fields
  signature: z.string().optional(),
  mintAddress: z.instanceof(PublicKey).optional(),
  poolAddress: z.instanceof(PublicKey).optional(),
  vaultAddress: z.instanceof(PublicKey).optional(),
});

export type LaunchFromFactory = z.infer<typeof LaunchFromFactorySchema>;

// Schema for validating createFactory() parameters
export const CreateFactorySchema = z.object({
  payer: z.instanceof(anchor.web3.Keypair, {
    message: "Payer must be a valid Keypair",
  }),
  owner: z.instanceof(anchor.web3.Keypair, {
    message: "Owner must be a valid Keypair",
  }),
  params: z.object({
    shift: z.instanceof(anchor.BN),
    initialTokenBReserves: z.instanceof(anchor.BN),
    feeParams: z.object({
      normalizationPeriod: z.instanceof(anchor.BN),
      decay: z.number().int().nonnegative(),
      royaltiesBps: z.number().int().nonnegative(),
    }),
    tokenParams: z.object({
      decimals: z.number().int().nonnegative(),
      mutable: z.boolean(),
    }),
  }),
});

export type CreateFactory = z.infer<typeof CreateFactorySchema>;

// Schema for validating claimRoyalties() parameters
export const ClaimRoyaltiesSchema = z.object({
  mint: z.instanceof(PublicKey, {
    message: "Mint must be a valid PublicKey",
  }),
  payer: z.instanceof(anchor.web3.Keypair, {
    message: "Payer must be a valid Keypair",
  }),
  claimer: z.instanceof(anchor.web3.Keypair, {
    message: "Claimer must be a valid Keypair",
  }),
  receiver: z
    .instanceof(PublicKey, {
      message: "Receiver must be a valid PublicKey",
    })
    .optional(),
});

export type ClaimRoyalties = z.infer<typeof ClaimRoyaltiesSchema>;

// Schema for validating sell() parameters
export const SellSchema = z.object({
  payer: z.instanceof(anchor.web3.Keypair, {
    message: "Payer must be a valid Keypair",
  }),
  user: z.instanceof(anchor.web3.Keypair, {
    message: "User must be a valid Keypair",
  }),
  mint: z.instanceof(PublicKey, {
    message: "Mint must be a valid PublicKey",
  }),
  amount: z.instanceof(anchor.BN, {
    message: "Amount must be a valid BN",
  }),
  limit: z
    .instanceof(anchor.BN, {
      message: "Limit must be a valid BN",
    })
    .optional(),
});

export type Sell = z.infer<typeof SellSchema>;

// Schema for validating launch() parameters
export const LaunchSchema = z.object({
  cfg: z.object({
    shift: z.instanceof(anchor.BN, {
      message: "Constant must be a valid BN",
    }),
    initialTokenBReserves: z.instanceof(anchor.BN, {
      message: "Initial token reserves must be a valid BN",
    }),
    feeParams: z.object({
      normalizationPeriod: z.instanceof(anchor.BN, {
        message: "Normalization period must be a valid BN",
      }),
      decay: z.number().int().nonnegative(),
      royaltiesBps: z.number().int().nonnegative(),
      feeExemptBuys: z.number().int().nonnegative(),
      reference: z.instanceof(anchor.BN, {
        message: "Reference must be a valid BN",
      }),
    }),
  }),
  payer: z.instanceof(anchor.web3.Keypair, {
    message: "Payer must be a valid Keypair",
  }),
  owner: z.instanceof(anchor.web3.Keypair, {
    message: "Owner must be a valid Keypair",
  }),
  tokenWalletAuthority: z.instanceof(anchor.web3.Keypair, {
    message: "Token wallet authority must be a valid Keypair",
  }),
  royaltiesOwner: z.instanceof(anchor.web3.PublicKey, {
    message: "Royalties owner must be a valid PublicKey",
  }),
  mint: z.instanceof(PublicKey, {
    message: "Mint must be a valid PublicKey",
  }),
  devBuyAmount: z
    .instanceof(anchor.BN, {
      message: "Dev buy amount must be a valid BN",
    })
    .optional(),
  dev: z
    .instanceof(anchor.web3.Keypair, {
      message: "Dev must be a valid Keypair",
    })
    .optional(),
  tokenProgram: z
    .instanceof(PublicKey, {
      message: "Token program must be a valid PublicKey",
    })
    .optional(),
});

export type Launch = z.infer<typeof LaunchSchema>;

export const BuySchema = z.object({
  payer: z.instanceof(anchor.web3.Keypair, {
    message: "Payer must be a valid Keypair",
  }),
  user: z.instanceof(anchor.web3.Keypair, {
    message: "User must be a valid Keypair",
  }),
  mint: z.instanceof(PublicKey, {
    message: "Mint must be a valid PublicKey",
  }),
  amount: z.instanceof(anchor.BN, {
    message: "Amount must be a valid BN",
  }),
  limit: z
    .instanceof(anchor.BN, {
      message: "Limit must be a valid BN",
    })
    .optional(),
});

export type Buy = z.infer<typeof BuySchema>;

// Schema for validating initialize() parameters
export const InitializeSchema = z.object({
  payer: z.instanceof(anchor.web3.Keypair, {
    message: "Payer must be a valid Keypair",
  }),
  authority: z.instanceof(anchor.web3.Keypair, {
    message: "Authority must be a valid Keypair",
  }),
});

export type Initialize = z.infer<typeof InitializeSchema>;
