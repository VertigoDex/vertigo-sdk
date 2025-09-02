import { SDKConfig } from "../types/sdk";

export const defaultConfig: SDKConfig = {
  logLevel: "verbose",
  explorer: "solscan",
  ammProgramId:
    process.env.AMM_PROGRAM_ID || "vrTGoBuy5rYSxAfV3jaRJWHH6nN9WK4NRExGxsk1bCJ",
};
