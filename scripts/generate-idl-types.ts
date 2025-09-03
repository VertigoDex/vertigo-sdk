#!/usr/bin/env node
import * as fs from "fs";
import * as path from "path";

const idlToTs = (idlPath: string, outputPath: string) => {
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf8"));

  // Simply export the IDL as a const with the proper Idl type
  const name =
    idl.metadata?.name || idl.name || path.basename(idlPath, ".json");
  const typeName = name
    .split("_")
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");

  const content = `import { Idl } from "@coral-xyz/anchor";

export const IDL: ${typeName} = ${JSON.stringify(idl, null, 2)};

export type ${typeName} = {
  address: string;
  metadata: {
    name: string;
    version: string;
    spec: string;
    description: string;
  };
  instructions: any[];
  accounts?: any[];
  events?: any[];
  errors?: any[];
  types?: any[];
};
`;

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, content);
  console.log(`Generated ${outputPath}`);
};

// Generate for all IDL files
const idlMappings = [
  { input: "target/idl/amm.json", output: "target/types/amm.ts" },
  {
    input: "target/idl/pool_authority.json",
    output: "target/types/pool_authority.ts",
  },
  {
    input: "target/idl/permissioned_relay.json",
    output: "target/types/permissioned_relay.ts",
  },
  {
    input: "target/idl/spl_token_factory.json",
    output: "target/types/spl_token_factory.ts",
  },
  {
    input: "target/idl/token_2022_factory.json",
    output: "target/types/token_2022_factory.ts",
  },
];

idlMappings.forEach(({ input, output }) => {
  idlToTs(input, output);
});
