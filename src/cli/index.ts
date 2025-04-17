#!/usr/bin/env bun

import { Command } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";
import { initCommand } from "./commands/factory/init";
import { launchCommand as factoryLaunchCommand } from "./commands/factory/launch";
import { ammCommand } from "./commands/amm";

const program = new Command();

program
  .name("vertigo")
  .version("1.0.0")
  .description("Vertigo CLI tool for managing token factories and pools");

// Factory commands
const factoryCommand = new Command("factory").description(
  "Manage token factories"
);

factoryCommand.addCommand(initCommand);
factoryCommand.addCommand(factoryLaunchCommand);

program.addCommand(factoryCommand);
program.addCommand(ammCommand);

program.parse(process.argv);
