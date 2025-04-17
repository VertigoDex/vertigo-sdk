import { Command } from "commander";
import { launchCommand } from "./launch";
import { buyCommand } from "./buy";
import { sellCommand } from "./sell";
import { claimCommand } from "./claim";
import { balanceCommand } from "./balance";

export const ammCommand = new Command("amm")
  .description("AMM commands")
  .addCommand(launchCommand)
  .addCommand(buyCommand)
  .addCommand(sellCommand)
  .addCommand(claimCommand)
  .addCommand(balanceCommand);
