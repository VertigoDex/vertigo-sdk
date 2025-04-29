import { SDKConfig } from "../types/sdk";

export const defaultConfig: SDKConfig = {
  logLevel: "verbose",
  explorer: "solscan",
  ammProgramId:
    process.env.AMM_PROGRAM_ID || "vrTGoBuy5rYSxAfV3jaRJWHH6nN9WK4NRExGxsk1bCJ",
  token2022FactoryProgramId:
    process.env.TOKEN_2022_FACTORY_PROGRAM_ID ||
    "FAcTgvrF2jAiPnWEZGLCV3PTQJrypa8GXLFowBv8T4Vs",
  splTokenFactoryProgramId:
    process.env.SPL_TOKEN_FACTORY_PROGRAM_ID ||
    "FactRtzKDU69a88rVZbnTofJFSVSDtzEHQG36NigvJjS",
};
