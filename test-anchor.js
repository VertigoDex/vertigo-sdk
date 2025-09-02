const anchor = require("@coral-xyz/anchor");
const { PublicKey, Connection, Keypair } = require("@solana/web3.js");

const connection = new Connection("https://api.devnet.solana.com");
const wallet = Keypair.generate();
const provider = new anchor.AnchorProvider(connection, wallet, {});

const idl = require("./target/idl/amm.json");
console.log("IDL loaded:", idl.name);
console.log("IDL address:", idl.metadata?.address);

try {
  const program = new anchor.Program(idl, new PublicKey("vrTGoBuy5rYSxAfV3jaRJWHH6nN9WK4NRExGxsk1bCJ"), provider);
  console.log("Program created successfully\!");
  console.log("Program ID:", program.programId.toBase58());
} catch (error) {
  console.error("Error creating program:", error.message);
}
