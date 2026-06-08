import { ethers } from "ethers";

const ABI = [
  "function storeHash(string calldata studentId, string calldata docType, string calldata fileHash) external",
  "function verifyHash(string calldata studentId, string calldata docType, string calldata fileHash) external view returns (bool)",
  "function getHash(string calldata studentId, string calldata docType) external view returns (string memory, uint256, address)",
  "function recordVerification(string calldata studentId, string calldata verificationId) external",
  "function lookupVerification(string calldata verificationId) external view returns (string memory)",
  "function checkDocumentExists(string calldata studentId, string calldata docType) external view returns (bool)",
];

function getContract() {
  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || "http://127.0.0.1:8545";
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  const contractAddress = process.env.CONTRACT_ADDRESS;

  if (!privateKey || !contractAddress) {
    throw new Error(
      "Blockchain not configured. Set DEPLOYER_PRIVATE_KEY and CONTRACT_ADDRESS in .env"
    );
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  return new ethers.Contract(contractAddress, ABI, wallet);
}

export async function storeDocumentHash(
  studentId: string,
  docType: string,
  fileHash: string
): Promise<string> {
  const contract = getContract();
  const tx = await contract.storeHash(studentId, docType.toLowerCase(), fileHash);
  const receipt = await tx.wait();
  return receipt.hash as string;
}

export async function verifyDocumentHash(
  studentId: string,
  docType: string,
  fileHash: string
): Promise<boolean> {
  const contract = getContract();
  return (await contract.verifyHash(studentId, docType.toLowerCase(), fileHash)) as boolean;
}

export async function recordVerificationOnChain(
  studentId: string,
  verificationId: string
): Promise<string> {
  const contract = getContract();
  const tx = await contract.recordVerification(studentId, verificationId);
  const receipt = await tx.wait();
  return receipt.hash as string;
}

export async function lookupVerificationOnChain(
  verificationId: string
): Promise<string> {
  const contract = getContract();
  return (await contract.lookupVerification(verificationId)) as string;
}

export async function isBlockchainAvailable(): Promise<boolean> {
  try {
    const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || "http://127.0.0.1:8545";
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    await provider.getBlockNumber();
    return true;
  } catch {
    return false;
  }
}
