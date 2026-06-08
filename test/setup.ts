/**
 * Global test setup — executed once before any test file is loaded.
 * Must set environment variables before any module that reads them is imported.
 */

process.env.SESSION_SECRET      = "test-super-secret-key-long-enough-for-crypto-32ch";
process.env.DATABASE_URL        = "file:./prisma/dev.db";
process.env.BLOCKCHAIN_RPC_URL  = "http://127.0.0.1:8545";
process.env.CONTRACT_ADDRESS    = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
process.env.DEPLOYER_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
process.env.APP_URL             = "http://localhost:5173";
process.env.NODE_ENV            = "test";
