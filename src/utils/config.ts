import { SDKConfig } from "../types/sdk";

export const defaultConfig: SDKConfig = {
  logLevel: "verbose",
  explorer: "solscan",
  ammProgramPath: "../../target/idl/amm.json",
  token2022ProgramPath: "../../target/idl/token_2022_factory.json",
  splTokenProgramPath: "../../target/idl/spl_token_factory.json",
};
