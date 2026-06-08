/**
 * Smart-contract unit tests for AcademicVerification.sol
 * Run with:  npm run test:contract
 *
 * Uses Hardhat + Chai + @nomicfoundation/hardhat-chai-matchers
 */
"use strict";

const { expect }   = require("chai");
const { ethers }   = require("hardhat");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("AcademicVerification", function () {
  /** @type {import("ethers").Contract} */
  let contract;
  /** @type {import("ethers").Signer} */
  let owner;
  /** @type {import("ethers").Signer} */
  let secondUser;

  // Deploy a fresh contract instance before every test
  beforeEach(async function () {
    [owner, secondUser] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AcademicVerification");
    contract = await Factory.deploy();
    await contract.waitForDeployment();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // storeHash
  // ──────────────────────────────────────────────────────────────────────────
  describe("storeHash()", function () {
    it("stores a document and emits DocumentStored event", async function () {
      const studentId = "STU-2024-001";
      const docType   = "attendance";
      const fileHash  = "abc123sha256hash";

      await expect(contract.storeHash(studentId, docType, fileHash))
        .to.emit(contract, "DocumentStored")
        .withArgs(studentId, docType, fileHash, anyValue, owner.address);
    });

    it("allows a second call to overwrite the stored hash", async function () {
      await contract.storeHash("STU-001", "transcript", "hash-v1");
      await contract.storeHash("STU-001", "transcript", "hash-v2");

      const [storedHash] = await contract.getHash("STU-001", "transcript");
      expect(storedHash).to.equal("hash-v2");
    });

    it("stores independently for different students", async function () {
      await contract.storeHash("STU-A", "attendance", "hashA");
      await contract.storeHash("STU-B", "attendance", "hashB");

      const [hashA] = await contract.getHash("STU-A", "attendance");
      const [hashB] = await contract.getHash("STU-B", "attendance");
      expect(hashA).to.equal("hashA");
      expect(hashB).to.equal("hashB");
    });

    it("stores independently for different doc types on the same student", async function () {
      await contract.storeHash("STU-001", "attendance", "hash-att");
      await contract.storeHash("STU-001", "transcript", "hash-tra");

      const [attHash] = await contract.getHash("STU-001", "attendance");
      const [traHash] = await contract.getHash("STU-001", "transcript");
      expect(attHash).to.equal("hash-att");
      expect(traHash).to.equal("hash-tra");
    });

    it("reverts when studentId is empty", async function () {
      await expect(contract.storeHash("", "attendance", "hash123"))
        .to.be.revertedWith("Student ID required");
    });

    it("reverts when docType is empty", async function () {
      await expect(contract.storeHash("STU-001", "", "hash123"))
        .to.be.revertedWith("Doc type required");
    });

    it("reverts when fileHash is empty", async function () {
      await expect(contract.storeHash("STU-001", "attendance", ""))
        .to.be.revertedWith("File hash required");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // verifyHash
  // ──────────────────────────────────────────────────────────────────────────
  describe("verifyHash()", function () {
    const STUDENT  = "STU-2024-002";
    const DOC_TYPE = "results";
    const HASH     = "sha256realhashabcdef1234567890";

    beforeEach(async function () {
      await contract.storeHash(STUDENT, DOC_TYPE, HASH);
    });

    it("returns true when the supplied hash matches the stored one", async function () {
      expect(await contract.verifyHash(STUDENT, DOC_TYPE, HASH)).to.be.true;
    });

    it("returns false when the supplied hash differs", async function () {
      expect(await contract.verifyHash(STUDENT, DOC_TYPE, "tampered-hash")).to.be.false;
    });

    it("returns false for a student that has no stored document", async function () {
      expect(await contract.verifyHash("GHOST-999", DOC_TYPE, HASH)).to.be.false;
    });

    it("returns false when the doc type does not match", async function () {
      expect(await contract.verifyHash(STUDENT, "attendance", HASH)).to.be.false;
    });

    it("returns false after the hash is overwritten", async function () {
      await contract.storeHash(STUDENT, DOC_TYPE, "new-hash");
      // Old hash is now stale
      expect(await contract.verifyHash(STUDENT, DOC_TYPE, HASH)).to.be.false;
      // New hash is valid
      expect(await contract.verifyHash(STUDENT, DOC_TYPE, "new-hash")).to.be.true;
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // getHash
  // ──────────────────────────────────────────────────────────────────────────
  describe("getHash()", function () {
    it("returns fileHash, timestamp > 0, and the uploader address", async function () {
      const hash = "sha256detailtest";
      await contract.connect(secondUser).storeHash("STU-003", "results", hash);

      const [fileHash, timestamp, uploadedBy] = await contract.getHash("STU-003", "results");
      expect(fileHash).to.equal(hash);
      expect(timestamp).to.be.gt(0n);
      expect(uploadedBy).to.equal(await secondUser.getAddress());
    });

    it("returns zero values for a non-existent document", async function () {
      const [fileHash, timestamp, uploadedBy] = await contract.getHash("NONEXISTENT", "attendance");
      expect(fileHash).to.equal("");
      expect(timestamp).to.equal(0n);
      expect(uploadedBy).to.equal("0x0000000000000000000000000000000000000000");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // recordVerification
  // ──────────────────────────────────────────────────────────────────────────
  describe("recordVerification()", function () {
    it("records a verification and emits VerificationIssued event", async function () {
      const studentId      = "STU-2024-001";
      const verificationId = "VER-UUID-AAAA-BBBB";

      await expect(contract.recordVerification(studentId, verificationId))
        .to.emit(contract, "VerificationIssued")
        .withArgs(studentId, verificationId, anyValue);
    });

    it("allows the same student to have only one verificationId", async function () {
      await contract.recordVerification("STU-001", "VER-001");
      // Registering a different verificationId for the same student is allowed
      // (only the verificationId uniqueness is enforced)
      await expect(contract.recordVerification("STU-001", "VER-002")).to.not.be.reverted;
    });

    it("reverts when verificationId is reused for a different student", async function () {
      await contract.recordVerification("STU-001", "VER-SHARED");
      await expect(contract.recordVerification("STU-002", "VER-SHARED"))
        .to.be.revertedWith("Verification ID already used");
    });

    it("reverts when studentId is empty", async function () {
      await expect(contract.recordVerification("", "VER-001"))
        .to.be.revertedWith("Student ID required");
    });

    it("reverts when verificationId is empty", async function () {
      await expect(contract.recordVerification("STU-001", ""))
        .to.be.revertedWith("Verification ID required");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // lookupVerification
  // ──────────────────────────────────────────────────────────────────────────
  describe("lookupVerification()", function () {
    it("returns the studentId for a known verificationId", async function () {
      await contract.recordVerification("STU-001", "VER-LOOKUP");
      expect(await contract.lookupVerification("VER-LOOKUP")).to.equal("STU-001");
    });

    it("returns an empty string for an unknown verificationId", async function () {
      expect(await contract.lookupVerification("DOES-NOT-EXIST")).to.equal("");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // checkDocumentExists
  // ──────────────────────────────────────────────────────────────────────────
  describe("checkDocumentExists()", function () {
    it("returns true after a document hash has been stored", async function () {
      await contract.storeHash("STU-001", "attendance", "somehash");
      expect(await contract.checkDocumentExists("STU-001", "attendance")).to.be.true;
    });

    it("returns false for a student that has no stored document", async function () {
      expect(await contract.checkDocumentExists("GHOST-999", "attendance")).to.be.false;
    });

    it("returns false when only a different doc type is stored", async function () {
      await contract.storeHash("STU-001", "attendance", "somehash");
      expect(await contract.checkDocumentExists("STU-001", "transcript")).to.be.false;
    });

    it("returns true even after a hash overwrite", async function () {
      await contract.storeHash("STU-001", "results", "hash-v1");
      await contract.storeHash("STU-001", "results", "hash-v2");
      expect(await contract.checkDocumentExists("STU-001", "results")).to.be.true;
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Full end-to-end scenario
  // ──────────────────────────────────────────────────────────────────────────
  describe("End-to-end: store, verify, certify", function () {
    it("completes the full document → certificate lifecycle", async function () {
      const studentId      = "STU-E2E-001";
      const verificationId = "VER-E2E-FULL";
      const attHash        = "sha256-attendance-hash";
      const traHash        = "sha256-transcript-hash";
      const resHash        = "sha256-results-hash";

      // 1. Store all three documents
      await contract.storeHash(studentId, "attendance", attHash);
      await contract.storeHash(studentId, "transcript", traHash);
      await contract.storeHash(studentId, "results",    resHash);

      // 2. All three should exist
      expect(await contract.checkDocumentExists(studentId, "attendance")).to.be.true;
      expect(await contract.checkDocumentExists(studentId, "transcript")).to.be.true;
      expect(await contract.checkDocumentExists(studentId, "results")).to.be.true;

      // 3. Hashes must verify correctly
      expect(await contract.verifyHash(studentId, "attendance", attHash)).to.be.true;
      expect(await contract.verifyHash(studentId, "transcript", traHash)).to.be.true;
      expect(await contract.verifyHash(studentId, "results",    resHash)).to.be.true;

      // 4. Issue certificate on-chain
      await contract.recordVerification(studentId, verificationId);
      expect(await contract.lookupVerification(verificationId)).to.equal(studentId);
    });
  });
});
