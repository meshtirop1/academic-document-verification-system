/**
 * Tests for /professor/upload route (loader + action)
 *
 * The multipart form parser, database, and blockchain are all mocked.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeGet, makeSessionCookie, parseJson, MOCK_PROFESSOR, MOCK_ADMIN, MOCK_STUDENT } from "../helpers";

// ── Mocks ─────────────────────────────────────────────────────────────────────
vi.mock("~/utils/db.server", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      findMany:   vi.fn(),
      findFirst:  vi.fn(),
    },
    document: {
      upsert:   vi.fn(),
      findMany: vi.fn(),
    },
    verificationCertificate: {
      findUnique: vi.fn(),
      create:     vi.fn(),
    },
  },
}));

vi.mock("~/utils/blockchain.server", () => ({
  storeDocumentHash:        vi.fn().mockResolvedValue("0xblockchainhash"),
  recordVerificationOnChain: vi.fn().mockResolvedValue("0xcerthash"),
  isBlockchainAvailable:    vi.fn().mockResolvedValue(true),
}));

// Mock the Remix multipart parser so we can control what the action "receives"
vi.mock("@remix-run/node", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@remix-run/node")>();
  return {
    ...actual,
    unstable_createMemoryUploadHandler: vi.fn(() => ({})),
    unstable_parseMultipartFormData:    vi.fn(),
  };
});

import * as remixNode from "@remix-run/node";
import { db }         from "~/utils/db.server";
import { loader, action } from "~/routes/professor.upload";

const mockParseMultipart = vi.mocked(remixNode.unstable_parseMultipartFormData);
const mockFindUnique     = vi.mocked(db.user.findUnique);
const mockFindManyUsers  = vi.mocked(db.user.findMany);
const mockFindFirst      = vi.mocked(db.user.findFirst);
const mockDocUpsert      = vi.mocked(db.document.upsert);
const mockDocFindMany    = vi.mocked(db.document.findMany);
const mockCertFindUnique = vi.mocked(db.verificationCertificate.findUnique);
const mockCertCreate     = vi.mocked(db.verificationCertificate.create);

const args = (req: Request, params = {}) => ({ request: req, params, context: {} });

/** Build a mock FormData representing a multipart upload */
function buildFormData(fields: Record<string, string | File>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v as any);
  return fd;
}

const MOCK_FILE = new File(["dummy file content for hash test"], "attendance.pdf", {
  type: "application/pdf",
});

async function professorCookie() {
  return makeSessionCookie(MOCK_PROFESSOR.id, "PROFESSOR");
}

// ────────────────────────────────────────────────────────────────────────────

describe("Professor Upload Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default auth: findUnique returns professor
    mockFindUnique.mockResolvedValue(MOCK_PROFESSOR as any);
    mockFindManyUsers.mockResolvedValue([MOCK_STUDENT] as any);
    mockDocUpsert.mockResolvedValue({} as any);
    mockDocFindMany.mockResolvedValue([] as any);
    mockCertFindUnique.mockResolvedValue(null);
    mockCertCreate.mockResolvedValue({} as any);
  });

  // ─── loader ───────────────────────────────────────────────────────────────
  describe("loader", () => {
    it("throws a redirect when unauthenticated", async () => {
      const req = makeGet("http://localhost/professor/upload");
      await expect(loader(args(req))).rejects.toMatchObject({ status: 302 });
    });

    it("throws a redirect for a STUDENT", async () => {
      mockFindUnique.mockResolvedValue(MOCK_STUDENT as any);
      const cookie = await makeSessionCookie(MOCK_STUDENT.id, "STUDENT");
      const req    = makeGet("http://localhost/professor/upload", cookie);
      await expect(loader(args(req))).rejects.toMatchObject({ status: 302 });
    });

    it("returns students list and blockchain availability for a professor", async () => {
      const cookie = await professorCookie();
      const req    = makeGet("http://localhost/professor/upload", cookie);
      const res    = await loader(args(req));
      const body   = await parseJson<{ students: unknown[]; bcAvailable: boolean }>(res);
      expect(Array.isArray(body.students)).toBe(true);
      expect(typeof body.bcAvailable).toBe("boolean");
    });
  });

  // ─── action — validation ──────────────────────────────────────────────────
  describe("action — field validation", () => {
    it("returns 400 when studentId is missing", async () => {
      mockParseMultipart.mockResolvedValue(
        buildFormData({ studentId: "", docType: "ATTENDANCE", file: MOCK_FILE }),
      );
      const cookie = await professorCookie();
      const req    = new Request("http://localhost/professor/upload", {
        method: "POST",
        headers: { Cookie: cookie },
      });
      const res  = await action(args(req));
      expect(res.status).toBe(400);
      const body = await parseJson<{ error: string }>(res);
      expect(body.error).toMatch(/required/i);
    });

    it("returns 400 when docType is missing", async () => {
      mockParseMultipart.mockResolvedValue(
        buildFormData({ studentId: "STU-001", docType: "", file: MOCK_FILE }),
      );
      const cookie = await professorCookie();
      const req    = new Request("http://localhost/professor/upload", {
        method: "POST",
        headers: { Cookie: cookie },
      });
      const res = await action(args(req));
      expect(res.status).toBe(400);
    });

    it("returns 400 when no file is provided", async () => {
      mockParseMultipart.mockResolvedValue(
        buildFormData({ studentId: "STU-001", docType: "ATTENDANCE" }),
      );
      const cookie = await professorCookie();
      const req    = new Request("http://localhost/professor/upload", {
        method: "POST",
        headers: { Cookie: cookie },
      });
      const res = await action(args(req));
      expect(res.status).toBe(400);
    });

    it("returns 400 for an invalid docType value", async () => {
      mockParseMultipart.mockResolvedValue(
        buildFormData({ studentId: "STU-001", docType: "INVALID_TYPE", file: MOCK_FILE }),
      );
      const cookie = await professorCookie();
      const req    = new Request("http://localhost/professor/upload", {
        method: "POST",
        headers: { Cookie: cookie },
      });
      const res  = await action(args(req));
      expect(res.status).toBe(400);
      const body = await parseJson<{ error: string }>(res);
      expect(body.error).toMatch(/invalid/i);
    });
  });

  // ─── action — successful upload ───────────────────────────────────────────
  describe("action — successful upload", () => {
    it("stores the document in DB and returns success with hash details", async () => {
      mockParseMultipart.mockResolvedValue(
        buildFormData({ studentId: "STU-2024-001", docType: "ATTENDANCE", file: MOCK_FILE }),
      );
      const cookie = await professorCookie();
      const req    = new Request("http://localhost/professor/upload", {
        method: "POST",
        headers: { Cookie: cookie },
      });
      const res  = await action(args(req));
      const body = await parseJson<{ success: boolean; fileHash: string; docType: string }>(res);

      expect(body.success).toBe(true);
      expect(body.docType).toBe("ATTENDANCE");
      expect(typeof body.fileHash).toBe("string");
      expect(body.fileHash).toHaveLength(64); // SHA-256 hex = 64 chars
      expect(mockDocUpsert).toHaveBeenCalledOnce();
    });

    it("includes txHash in the response when blockchain is available", async () => {
      mockParseMultipart.mockResolvedValue(
        buildFormData({ studentId: "STU-2024-001", docType: "TRANSCRIPT", file: MOCK_FILE }),
      );
      const cookie = await professorCookie();
      const req    = new Request("http://localhost/professor/upload", {
        method: "POST",
        headers: { Cookie: cookie },
      });
      const res  = await action(args(req));
      const body = await parseJson<{ txHash: string | null }>(res);
      expect(body.txHash).toBe("0xblockchainhash");
    });

    it("upserts the document with the uploading professor's ID", async () => {
      mockParseMultipart.mockResolvedValue(
        buildFormData({ studentId: "STU-2024-001", docType: "RESULTS", file: MOCK_FILE }),
      );
      const cookie = await professorCookie();
      const req    = new Request("http://localhost/professor/upload", {
        method: "POST",
        headers: { Cookie: cookie },
      });
      await action(args(req));

      expect(mockDocUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ uploadedById: MOCK_PROFESSOR.id }),
          update: expect.objectContaining({ uploadedById: MOCK_PROFESSOR.id }),
        }),
      );
    });
  });

  // ─── action — certificate issuance ───────────────────────────────────────
  describe("action — certificate auto-issuance", () => {
    it("does NOT create a certificate when fewer than 3 document types exist", async () => {
      // Only 1 document uploaded so far
      mockDocFindMany.mockResolvedValue([
        { studentId: "STU-2024-001", docType: "ATTENDANCE" },
      ] as any);
      mockParseMultipart.mockResolvedValue(
        buildFormData({ studentId: "STU-2024-001", docType: "ATTENDANCE", file: MOCK_FILE }),
      );

      const cookie = await professorCookie();
      const req    = new Request("http://localhost/professor/upload", {
        method: "POST",
        headers: { Cookie: cookie },
      });
      const res  = await action(args(req));
      const body = await parseJson<{ certCreated: boolean }>(res);

      expect(body.certCreated).toBe(false);
      expect(mockCertCreate).not.toHaveBeenCalled();
    });

    it("creates a certificate when all 3 document types are uploaded", async () => {
      // All 3 docs exist after this upload
      mockDocFindMany.mockResolvedValue([
        { studentId: "STU-2024-001", docType: "ATTENDANCE" },
        { studentId: "STU-2024-001", docType: "TRANSCRIPT" },
        { studentId: "STU-2024-001", docType: "RESULTS" },
      ] as any);
      mockFindFirst.mockResolvedValue({ name: MOCK_STUDENT.name } as any);
      mockCertFindUnique.mockResolvedValue(null); // No existing cert
      mockParseMultipart.mockResolvedValue(
        buildFormData({ studentId: "STU-2024-001", docType: "RESULTS", file: MOCK_FILE }),
      );

      const cookie = await professorCookie();
      const req    = new Request("http://localhost/professor/upload", {
        method: "POST",
        headers: { Cookie: cookie },
      });
      const res  = await action(args(req));
      const body = await parseJson<{ certCreated: boolean }>(res);

      expect(body.certCreated).toBe(true);
      expect(mockCertCreate).toHaveBeenCalledOnce();
      expect(mockCertCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            studentId:          "STU-2024-001",
            attendanceVerified: true,
            transcriptVerified: true,
            resultsVerified:    true,
            fullyVerified:      true,
          }),
        }),
      );
    });

    it("does NOT create a duplicate certificate if one already exists", async () => {
      mockDocFindMany.mockResolvedValue([
        { studentId: "STU-2024-001", docType: "ATTENDANCE" },
        { studentId: "STU-2024-001", docType: "TRANSCRIPT" },
        { studentId: "STU-2024-001", docType: "RESULTS" },
      ] as any);
      mockFindFirst.mockResolvedValue({ name: MOCK_STUDENT.name } as any);
      // Certificate already exists
      mockCertFindUnique.mockResolvedValue({ id: "existing-cert" } as any);
      mockParseMultipart.mockResolvedValue(
        buildFormData({ studentId: "STU-2024-001", docType: "RESULTS", file: MOCK_FILE }),
      );

      const cookie = await professorCookie();
      const req    = new Request("http://localhost/professor/upload", {
        method: "POST",
        headers: { Cookie: cookie },
      });
      const res  = await action(args(req));
      const body = await parseJson<{ certCreated: boolean }>(res);

      expect(body.certCreated).toBe(false);
      expect(mockCertCreate).not.toHaveBeenCalled();
    });
  });
});
