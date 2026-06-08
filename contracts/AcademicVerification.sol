// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * Academic Integrity Verification System
 * Stores SHA-256 document hashes on-chain and issues verification records.
 */
contract AcademicVerification {

    struct Document {
        string  fileHash;
        uint256 timestamp;
        address uploadedBy;
        bool    exists;
    }

    // studentId => docType => Document
    mapping(string => mapping(string => Document)) private documents;

    // verificationId => studentId
    mapping(string => string) private verificationIndex;

    event DocumentStored(
        string indexed studentId,
        string          docType,
        string          fileHash,
        uint256         timestamp,
        address         uploadedBy
    );

    event VerificationIssued(
        string indexed studentId,
        string          verificationId,
        uint256         timestamp
    );

    // ─── Write ───────────────────────────────────────────────────────────────

    /**
     * Store a SHA-256 hash for a student document.
     * Overwrites any previous hash for the same (studentId, docType) pair.
     */
    function storeHash(
        string calldata studentId,
        string calldata docType,
        string calldata fileHash
    ) external {
        require(bytes(studentId).length > 0, "Student ID required");
        require(bytes(docType).length   > 0, "Doc type required");
        require(bytes(fileHash).length  > 0, "File hash required");

        documents[studentId][docType] = Document({
            fileHash:   fileHash,
            timestamp:  block.timestamp,
            uploadedBy: msg.sender,
            exists:     true
        });

        emit DocumentStored(studentId, docType, fileHash, block.timestamp, msg.sender);
    }

    /**
     * Record a final verification certificate on-chain.
     * Each verificationId can only be registered once.
     */
    function recordVerification(
        string calldata studentId,
        string calldata verificationId
    ) external {
        require(bytes(studentId).length      > 0, "Student ID required");
        require(bytes(verificationId).length > 0, "Verification ID required");
        require(
            bytes(verificationIndex[verificationId]).length == 0,
            "Verification ID already used"
        );

        verificationIndex[verificationId] = studentId;
        emit VerificationIssued(studentId, verificationId, block.timestamp);
    }

    // ─── Read ────────────────────────────────────────────────────────────────

    /**
     * Compare a supplied hash against the stored hash.
     * Returns false if no document has been stored yet.
     */
    function verifyHash(
        string calldata studentId,
        string calldata docType,
        string calldata fileHash
    ) external view returns (bool) {
        Document memory doc = documents[studentId][docType];
        if (!doc.exists) return false;
        return keccak256(bytes(doc.fileHash)) == keccak256(bytes(fileHash));
    }

    /** Return the stored hash, block timestamp, and uploader address. */
    function getHash(
        string calldata studentId,
        string calldata docType
    ) external view returns (string memory fileHash, uint256 timestamp, address uploadedBy) {
        Document memory doc = documents[studentId][docType];
        return (doc.fileHash, doc.timestamp, doc.uploadedBy);
    }

    /** Return the studentId associated with a verificationId (empty string if not found). */
    function lookupVerification(
        string calldata verificationId
    ) external view returns (string memory) {
        return verificationIndex[verificationId];
    }

    /** Check whether a document has been stored for a given student and type. */
    function checkDocumentExists(
        string calldata studentId,
        string calldata docType
    ) external view returns (bool) {
        return documents[studentId][docType].exists;
    }
}
