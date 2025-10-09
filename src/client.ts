import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import type { Amm } from "../target/types/amm";
import ammIdlJson from "../target/idl/amm.json";
import {
  VERTIGO_PROGRAMS,
  DEFAULT_COMMITMENT,
  RPC_ENDPOINTS,
  Network,
} from "./core/constants";
import {
  quote,
  swap,
  claim,
  create,
  QuoteParams,
  SwapParams,
  ClaimParams,
  CreateParams,
  QuoteResult,
  SwapResult,
  ClaimResult,
  CreateResult,
} from "./helpers";
import * as instructions from "./instructions";

export type VertigoConfig = {
  connection?: Connection;
  wallet?: anchor.Wallet;
  network?: Network;
  commitment?: anchor.web3.Commitment;
  programId?: PublicKey;
};

export class VertigoClient {
  public readonly connection: Connection;
  public readonly wallet?: anchor.Wallet;
  public readonly network: Network;
  public readonly provider: anchor.AnchorProvider;
  public readonly program: anchor.Program<Amm>;

  private constructor(
    connection: Connection,
    wallet: anchor.Wallet | undefined,
    network: Network,
    commitment: anchor.web3.Commitment,
    programId: PublicKey
  ) {
    this.connection = connection;
    this.wallet = wallet;
    this.network = network;

    const walletAdapter = wallet || {
      publicKey: PublicKey.default,
      signTransaction: async (tx: any) => tx,
      signAllTransactions: async (txs: any[]) => txs,
    };

    this.provider = new anchor.AnchorProvider(this.connection, walletAdapter, {
      commitment,
    });

    const modifiedIdl = JSON.parse(JSON.stringify(ammIdlJson));
    if (!modifiedIdl.metadata) {
      modifiedIdl.metadata = {};
    }
    modifiedIdl.metadata.address = programId.toBase58();

    this.program = new anchor.Program(modifiedIdl, this.provider);

    (this.program as any)._programId = programId;
  }

  static async load(config: VertigoConfig = {}): Promise<VertigoClient> {
    const network = config.network || "mainnet";
    const connection =
      config.connection ||
      new Connection(
        RPC_ENDPOINTS[network],
        config.commitment || DEFAULT_COMMITMENT
      );
    const commitment = config.commitment || DEFAULT_COMMITMENT;
    const programId = config.programId || VERTIGO_PROGRAMS[network].AMM;

    return new VertigoClient(
      connection,
      config.wallet,
      network,
      commitment,
      programId
    );
  }

  async quote(
    params: Omit<QuoteParams, "program" | "connection">
  ): Promise<QuoteResult> {
    return quote({
      ...params,
      program: this.program,
      connection: this.connection,
    });
  }

  async swap(
    params: Omit<SwapParams, "program" | "connection" | "user">
  ): Promise<SwapResult> {
    if (!this.wallet) {
      throw new Error("Wallet required for swap operations");
    }

    return swap({
      ...params,
      program: this.program,
      connection: this.connection,
      user: this.wallet.publicKey,
    });
  }

  async claim(
    params: Omit<ClaimParams, "program" | "connection" | "claimer">
  ): Promise<ClaimResult> {
    if (!this.wallet) {
      throw new Error("Wallet required for claim operations");
    }

    return claim({
      ...params,
      program: this.program,
      connection: this.connection,
      claimer: this.wallet.publicKey,
    });
  }

  async create(
    params: Omit<CreateParams, "program" | "connection" | "payer">
  ): Promise<CreateResult> {
    if (!this.wallet) {
      throw new Error("Wallet required for create operations");
    }

    return create({
      ...params,
      program: this.program,
      connection: this.connection,
      payer: this.wallet.publicKey,
    });
  }

  get instructions() {
    return instructions;
  }
}

export const Vertigo = {
  load: VertigoClient.load,
};
