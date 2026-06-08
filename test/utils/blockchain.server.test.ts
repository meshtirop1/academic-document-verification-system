/**
 * Unit tests for app/utils/blockchain.server.ts
 *
 * The ethers library is mocked so no real RPC connection is required.
 * NOTE: Vitest hoists vi.mock() calls, so module-level variables defined
 * before the mock factory ARE accessible inside it (the factory runs lazily
 * when the module is first imported, after all top-level code initialises).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Shared mock objects (referenced inside the vi.mock factory below) ─────────
const mockGetBlockNumber     = vi.fn();
const mockStoreHash          = vi.fn();
const mockVerifyHash         = vi.fn();
const mockRecordVerification = vi.fn();
const mockLookupVerification = vi.fn();

const mockProviderObj = { getBlockNumber: mockGetBlockNumber };
const mockContractObj = {
  storeHash:          mockStoreHash,
  verifyHash:         mockVerifyHash,
  recordVerification: mockRecordVerification,
  lookupVerification: mockLookupVerification,
};

// ── Mock ethers ───────────────────────────────────────────────────────────────
// Must use regular functions (not arrow functions) for constructor mocks.
vi.mock("ethers", () => ({
  ethers: {
    // eslint-disable-next-line prefer-arrow-callback
    JsonRpcProvider: vi.fn(function MockProvider() { return mockProviderObj; }),
    // eslint-disable-next-line prefer-arrow-callback
    Wallet:          vi.fn(function MockWallet()   { return {}; }),
    // eslint-disable-next-line prefer-arrow-callback
    Contract:        vi.fn(function MockContract() { return mockContractObj; }),
  },
}));

import {
  isBlockchainAvailable,
  storeDocumentHash,
  verifyDocumentHash,
  recordVerificationOnChain,
  lookupVerificationOnChain,
} from "~/utils/blockchain.server";

// ────────────────────────────────────────────────────────────────────────────

describe("blockchain.server", () => {
  beforeEach(() => vi.clearAllMocks());

  // ─── isBlockchainAvailable ────────────────────────────────────────────────
  describe("isBlockchainAvailable()", () => {
    it("returns true when the provider responds to getBlockNumber", async () => {
      mockGetBlockNumber.mockResolvedValue(42);
      expect(await isBlockchainAvailable()).toBe(true);
    });

    it("returns false when the provider throws (node offline)", async () => {
      mockGetBlockNumber.mockRejectedValue(new Error("connect ECONNREFUSED"));
      expect(await isBlockchainAvailable()).toBe(false);
    });

    it("returns false when the provider times out", async () => {
      mockGetBlockNumber.mockRejectedValue(new Error("timeout"));
      expect(await isBlockchainAvailable()).toBe(false);
    });
  });

  // ─── storeDocumentHash ────────────────────────────────────────────────────
  describe("storeDocumentHash()", () => {
    it("calls storeHash on the contract and returns the tx hash", async () => {
      const fakeTxHash = "0xabc123def456";
      mockStoreHash.mockResolvedValue({
        wait: vi.fn().mockResolvedValue({ hash: fakeTxHash }),
      });

      const result = await storeDocumentHash("STU-001", "ATTENDANCE", "sha256hash");
      expect(result).toBe(fakeTxHash);
      expect(mockStoreHash).toHaveBeenCalledWith("STU-001", "attendance", "sha256hash");
    });

    it("lowercases the docType before calling the contract", async () => {
      mockStoreHash.mockResolvedValue({
        wait: vi.fn().mockResolvedValue({ hash: "0x1" }),
      });
      await storeDocumentHash("STU-001", "TRANSCRIPT", "hash");
      expect(mockStoreHash).toHaveBeenCalledWith("STU-001", "transcript", "hash");
    });

    it("propagates errors from the contract call", async () => {
      mockStoreHash.mockRejectedValue(new Error("execution reverted"));
      await expect(storeDocumentHash("STU-001", "RESULTS", "hash"))
        .rejects.toThrow("execution reverted");
    });
  });

  // ─── verifyDocumentHash ───────────────────────────────────────────────────
  describe("verifyDocumentHash()", () => {
    it("returns true when the contract confirms the hash", async () => {
      mockVerifyHash.mockResolvedValue(true);
      expect(await verifyDocumentHash("STU-001", "ATTENDANCE", "goodhash")).toBe(true);
    });

    it("returns false when the contract rejects the hash", async () => {
      mockVerifyHash.mockResolvedValue(false);
      expect(await verifyDocumentHash("STU-001", "TRANSCRIPT", "badhash")).toBe(false);
    });

    it("lowercases the docType before calling the contract", async () => {
      mockVerifyHash.mockResolvedValue(true);
      await verifyDocumentHash("STU-001", "RESULTS", "hash");
      expect(mockVerifyHash).toHaveBeenCalledWith("STU-001", "results", "hash");
    });
  });

  // ─── recordVerificationOnChain ────────────────────────────────────────────
  describe("recordVerificationOnChain()", () => {
    it("calls recordVerification and returns the tx hash", async () => {
      const fakeTxHash = "0xcert123";
      mockRecordVerification.mockResolvedValue({
        wait: vi.fn().mockResolvedValue({ hash: fakeTxHash }),
      });

      const result = await recordVerificationOnChain("STU-001", "VER-UUID");
      expect(result).toBe(fakeTxHash);
      expect(mockRecordVerification).toHaveBeenCalledWith("STU-001", "VER-UUID");
    });
  });

  // ─── lookupVerificationOnChain ────────────────────────────────────────────
  describe("lookupVerificationOnChain()", () => {
    it("returns the studentId for a known verificationId", async () => {
      mockLookupVerification.mockResolvedValue("STU-001");
      const result = await lookupVerificationOnChain("VER-UUID");
      expect(result).toBe("STU-001");
    });

    it("returns an empty string for an unknown verificationId", async () => {
      mockLookupVerification.mockResolvedValue("");
      const result = await lookupVerificationOnChain("UNKNOWN");
      expect(result).toBe("");
    });
  });

  // ─── Missing env vars guard ───────────────────────────────────────────────
  describe("getContract() configuration guard", () => {
    it("throws when CONTRACT_ADDRESS is missing", async () => {
      const original = process.env.CONTRACT_ADDRESS;
      delete process.env.CONTRACT_ADDRESS;

      await expect(storeDocumentHash("STU-001", "ATTENDANCE", "hash"))
        .rejects.toThrow(/Blockchain not configured/i);

      process.env.CONTRACT_ADDRESS = original;
    });

    it("throws when DEPLOYER_PRIVATE_KEY is missing", async () => {
      const original = process.env.DEPLOYER_PRIVATE_KEY;
      delete process.env.DEPLOYER_PRIVATE_KEY;

      await expect(storeDocumentHash("STU-001", "ATTENDANCE", "hash"))
        .rejects.toThrow(/Blockchain not configured/i);

      process.env.DEPLOYER_PRIVATE_KEY = original;
    });
  });
});
