/**
 * Tests for /verify (index) and /verify/:id routes.
 *
 * The database is mocked; the QR library is mocked for the :id route.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeGet, parseJson, MOCK_CERT, MOCK_STUDENT } from "../helpers";

// ── Mocks ─────────────────────────────────────────────────────────────────────
vi.mock("~/utils/db.server", () => ({
  db: {
    verificationCertificate: {
      findUnique: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,MOCK_QR_DATA"),
  },
}));

import { db }                          from "~/utils/db.server";
import { loader as verifyIndexLoader } from "~/routes/verify._index";
import { loader as verifyIdLoader }    from "~/routes/verify.$id";

const mockCertFindUnique  = vi.mocked(db.verificationCertificate.findUnique);
const mockUserFindFirst   = vi.mocked(db.user.findFirst);

const args      = (req: Request, params: Record<string, string> = {}) =>
  ({ request: req, params, context: {} });

// ────────────────────────────────────────────────────────────────────────────

describe("Verify Route — /verify (index)", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("loader — no query", () => {
    it("returns empty state when no search query is provided", async () => {
      const req  = makeGet("http://localhost/verify");
      const res  = await verifyIndexLoader(args(req));
      const body = await parseJson<{ q: string; cert: null; student: null }>(res);
      expect(body.q).toBe("");
      expect(body.cert).toBeNull();
      expect(body.student).toBeNull();
    });
  });

  describe("loader — search by studentId", () => {
    it("finds a certificate by studentId when verificationId search misses", async () => {
      // First call (by verificationId) → null; second call (by studentId) → cert
      mockCertFindUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(MOCK_CERT as any);
      mockUserFindFirst.mockResolvedValue({
        name:      MOCK_STUDENT.name,
        email:     MOCK_STUDENT.email,
        studentId: MOCK_STUDENT.studentId,
      } as any);

      const req  = makeGet(`http://localhost/verify?q=${MOCK_STUDENT.studentId}`);
      const res  = await verifyIndexLoader(args(req));
      const body = await parseJson<{ cert: typeof MOCK_CERT; student: unknown }>(res);

      expect(body.cert).toMatchObject({ verificationId: MOCK_CERT.verificationId });
      expect(body.student).toMatchObject({ name: MOCK_STUDENT.name });
    });
  });

  describe("loader — search by verificationId", () => {
    it("finds a certificate directly by verificationId on the first try", async () => {
      mockCertFindUnique.mockResolvedValueOnce(MOCK_CERT as any);
      mockUserFindFirst.mockResolvedValue({ name: MOCK_STUDENT.name } as any);

      const req  = makeGet(`http://localhost/verify?q=${MOCK_CERT.verificationId}`);
      const res  = await verifyIndexLoader(args(req));
      const body = await parseJson<{ cert: typeof MOCK_CERT }>(res);

      expect(body.cert?.fullyVerified).toBe(true);
      // Only one findUnique call should have been made
      expect(mockCertFindUnique).toHaveBeenCalledTimes(1);
    });
  });

  describe("loader — not found", () => {
    it("returns null cert and null student when query matches nothing", async () => {
      mockCertFindUnique.mockResolvedValue(null);

      const req  = makeGet("http://localhost/verify?q=UNKNOWN-ID");
      const res  = await verifyIndexLoader(args(req));
      const body = await parseJson<{ q: string; cert: null; student: null }>(res);

      expect(body.q).toBe("UNKNOWN-ID");
      expect(body.cert).toBeNull();
      expect(body.student).toBeNull();
    });

    it("does not call user.findFirst when certificate is not found", async () => {
      mockCertFindUnique.mockResolvedValue(null);
      const req = makeGet("http://localhost/verify?q=GHOST");
      await verifyIndexLoader(args(req));
      expect(mockUserFindFirst).not.toHaveBeenCalled();
    });
  });

  describe("loader — query whitespace trimming", () => {
    it("strips leading/trailing whitespace from the query", async () => {
      mockCertFindUnique.mockResolvedValue(null);
      const req  = makeGet("http://localhost/verify?q=  STU-001  ");
      const res  = await verifyIndexLoader(args(req));
      const body = await parseJson<{ q: string }>(res);
      expect(body.q).toBe("STU-001");
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────

describe("Verify Route — /verify/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("loader — found by verificationId", () => {
    it("returns cert, a QR code data URL, and the verify URL", async () => {
      mockCertFindUnique.mockResolvedValueOnce(MOCK_CERT as any);

      const req  = makeGet(`http://localhost/verify/${MOCK_CERT.verificationId}`);
      const res  = await verifyIdLoader(args(req, { id: MOCK_CERT.verificationId }));
      const body = await parseJson<{
        cert: typeof MOCK_CERT;
        qrDataUrl: string;
        verifyUrl: string;
      }>(res);

      expect(body.cert.verificationId).toBe(MOCK_CERT.verificationId);
      expect(body.qrDataUrl).toMatch(/^data:image\/png;base64,/);
      expect(body.verifyUrl).toContain(MOCK_CERT.verificationId);
    });
  });

  describe("loader — found by studentId fallback", () => {
    it("tries verificationId first and falls back to studentId lookup", async () => {
      // First call (verificationId) → null; second call (studentId) → cert
      mockCertFindUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(MOCK_CERT as any);

      const req  = makeGet(`http://localhost/verify/${MOCK_CERT.studentId}`);
      const res  = await verifyIdLoader(args(req, { id: MOCK_CERT.studentId }));
      const body = await parseJson<{ cert: typeof MOCK_CERT }>(res);

      expect(body.cert.studentId).toBe(MOCK_CERT.studentId);
    });
  });

  describe("loader — not found", () => {
    it("throws a 404 Response when the certificate does not exist", async () => {
      mockCertFindUnique.mockResolvedValue(null);

      const req = makeGet("http://localhost/verify/INVALID-ID");
      const err = await verifyIdLoader(args(req, { id: "INVALID-ID" })).catch((e) => e);

      expect(err).toBeInstanceOf(Response);
      expect((err as Response).status).toBe(404);
    });
  });
});
