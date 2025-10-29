import { Vertigo } from "../src";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import bs58 from "bs58";

const main = async () => {
  const privateKey = process.env.DEVNET_PRIVATE_KEY;
  if (!privateKey) throw new Error("DEVNET_PRIVATE_KEY not set");

  const ownerKeypair = Keypair.fromSecretKey(bs58.decode(privateKey));
  const connection = new Connection(
    "https://api.mainnet-beta.solana.com",
    "confirmed",
  );

  const vertigo = await Vertigo.load({
    connection,
    wallet: new anchor.Wallet(ownerKeypair),
    network: "mainnet",
  });

  // Try to inspect what Anchor expects
  console.log("Program IDL accounts for 'create':");
  const createInstruction = vertigo.program.idl.instructions.find(
    (ix: any) => ix.name === "create",
  );
  console.log(JSON.stringify(createInstruction?.args, null, 2));

  // Check the CreateParams type definition
  console.log("\nLooking for CreateParams type...");
  const createParamsType = vertigo.program.idl.types?.find(
    (t: any) => t.name === "CreateParams",
  );
  console.log(JSON.stringify(createParamsType, null, 2));

  console.log("\nLooking for FeeParams type...");
  const feeParamsType = vertigo.program.idl.types?.find(
    (t: any) => t.name === "FeeParams",
  );
  console.log(JSON.stringify(feeParamsType, null, 2));

  // Try creating with explicit snake_case
  console.log("\n🧪 Testing parameter object...");
  const testParams = {
    shift: new anchor.BN(1000),
    initial_token_b_reserves: new anchor.BN(1000000),
    fee_params: {
      normalization_period: new anchor.BN(3600),
      decay: 0.99,
      reference: new anchor.BN(Math.floor(Date.now() / 1000)),
      royalties_bps: 250,
      privileged_swapper: null,
    },
  };

  console.log("Parameter object:");
  console.log(
    JSON.stringify(
      testParams,
      (key, value) =>
        typeof value === "object" && value !== null && value._bn
          ? value.toString()
          : value,
      2,
    ),
  );

  // Try to encode it
  try {
    const coder = vertigo.program.coder.instruction;
    const encoded = coder.encode("create", testParams);
    console.log("\n✅ Successfully encoded!");
    console.log("Encoded bytes length:", encoded.length);
  } catch (error: any) {
    console.error("\n❌ Encoding failed:", error.message);
  }
};

main().catch(console.error);
