import { Idl } from "@coral-xyz/anchor";
import fs from "fs";
import path from "path";

const generateTypeFromIdl = (idlPath: string, outputPath: string) => {
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf8"));
  const name =
    idl.metadata?.name || idl.name || path.basename(idlPath, ".json");
  const typeName = name
    .split("_")
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");

  const typeDefinition = `export type ${typeName} = ${JSON.stringify(idl, null, 2)};`;

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, typeDefinition);
  console.log(`Generated ${outputPath}`);
};

// Generate types for all IDL files
const idlFiles = [
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

idlFiles.forEach(({ input, output }) => {
  generateTypeFromIdl(input, output);
});
