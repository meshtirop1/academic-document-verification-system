/**
 * Deploy AcademicVerification contract to the local Hardhat node.
 * Run: npm run deploy:contract
 *
 * After deployment, copy CONTRACT_ADDRESS into your .env file.
 */
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

async function main() {
  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || "http://127.0.0.1:8545";
  // Default Hardhat account #0 private key
  const privateKey =
    process.env.DEPLOYER_PRIVATE_KEY ||
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log("Deploying from:", wallet.address);

  // Read compiled artifact produced by: npx hardhat compile
  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/AcademicVerification.sol/AcademicVerification.json"
  );

  if (!fs.existsSync(artifactPath)) {
    console.error("Artifact not found. Run: npx hardhat compile");
    process.exit(1);
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("AcademicVerification deployed to:", address);
  console.log("\nAdd this to your .env file:");
  console.log(`CONTRACT_ADDRESS="${address}"`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
