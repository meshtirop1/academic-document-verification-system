/**
 * Unit tests for app/utils/auth.server.ts
 *
 * The database (Prisma) is mocked; real session cookies are used so the
 * auth guard logic itself is exercised without any DB dependency.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeGet, makeSessionCookie, MOCK_ADMIN, MOCK_PROFESSOR, MOCK_STUDENT } from "../helpers";

// ── Mock the database ────────────────────────────────────────────────────────
vi.mock("~/utils/db.server", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { db } from "~/utils/db.server";
import {
  getUser,
  requireUser,
  requireAdmin,
  requireProfessor,
  requireStudent,
} from "~/utils/auth.server";

const mockFindUnique = vi.mocked(db.user.findUnique);

// ────────────────────────────────────────────────────────────────────────────

describe("auth.server", () => {
  beforeEach(() => vi.clearAllMocks());

  // ─── getUser ───────────────────────────────────────────────────────────────
  describe("getUser()", () => {
    it("returns null when the request has no session cookie", async () => {
      const req = makeGet("http://localhost/");
      expect(await getUser(req)).toBeNull();
    });

    it("returns the user when authenticated and found in the database", async () => {
      mockFindUnique.mockResolvedValue(MOCK_ADMIN as any);
      const cookie = await makeSessionCookie(MOCK_ADMIN.id, "ADMIN");
      const req    = makeGet("http://localhost/admin", cookie);
      const user   = await getUser(req);
      expect(user).toMatchObject({ id: MOCK_ADMIN.id, role: "ADMIN" });
    });

    it("returns null when the userId from the session no longer exists in the database", async () => {
      mockFindUnique.mockResolvedValue(null);
      const cookie = await makeSessionCookie("deleted-user", "STUDENT");
      const req    = makeGet("http://localhost/student", cookie);
      expect(await getUser(req)).toBeNull();
    });

    it("returns null (swallows error) when the database throws", async () => {
      mockFindUnique.mockRejectedValue(new Error("DB connection lost"));
      const cookie = await makeSessionCookie("user-1", "ADMIN");
      const req    = makeGet("http://localhost/admin", cookie);
      expect(await getUser(req)).toBeNull();
    });
  });

  // ─── requireUser ──────────────────────────────────────────────────────────
  describe("requireUser()", () => {
    it("throws a redirect when no session exists", async () => {
      const req = makeGet("http://localhost/admin");
      await expect(requireUser(req)).rejects.toMatchObject({ status: 302 });
    });

    it("throws a redirect when the user no longer exists in the database", async () => {
      mockFindUnique.mockResolvedValue(null);
      const cookie = await makeSessionCookie("ghost", "ADMIN");
      const req    = makeGet("http://localhost/admin", cookie);
      await expect(requireUser(req)).rejects.toMatchObject({ status: 302 });
    });

    it("resolves with the user record when authenticated", async () => {
      mockFindUnique.mockResolvedValue(MOCK_PROFESSOR as any);
      const cookie = await makeSessionCookie(MOCK_PROFESSOR.id, "PROFESSOR");
      const req    = makeGet("http://localhost/professor", cookie);
      const user   = await requireUser(req);
      expect(user.id).toBe(MOCK_PROFESSOR.id);
    });
  });

  // ─── requireAdmin ─────────────────────────────────────────────────────────
  describe("requireAdmin()", () => {
    it("throws a redirect when unauthenticated", async () => {
      const req = makeGet("http://localhost/admin");
      await expect(requireAdmin(req)).rejects.toMatchObject({ status: 302 });
    });

    it("throws a redirect when the authenticated user is a PROFESSOR", async () => {
      mockFindUnique.mockResolvedValue(MOCK_PROFESSOR as any);
      const cookie = await makeSessionCookie(MOCK_PROFESSOR.id, "PROFESSOR");
      const req    = makeGet("http://localhost/admin", cookie);
      await expect(requireAdmin(req)).rejects.toMatchObject({ status: 302 });
    });

    it("throws a redirect when the authenticated user is a STUDENT", async () => {
      mockFindUnique.mockResolvedValue(MOCK_STUDENT as any);
      const cookie = await makeSessionCookie(MOCK_STUDENT.id, "STUDENT");
      const req    = makeGet("http://localhost/admin", cookie);
      await expect(requireAdmin(req)).rejects.toMatchObject({ status: 302 });
    });

    it("resolves and returns the user when role is ADMIN", async () => {
      mockFindUnique.mockResolvedValue(MOCK_ADMIN as any);
      const cookie = await makeSessionCookie(MOCK_ADMIN.id, "ADMIN");
      const req    = makeGet("http://localhost/admin", cookie);
      const user   = await requireAdmin(req);
      expect(user.role).toBe("ADMIN");
    });
  });

  // ─── requireProfessor ─────────────────────────────────────────────────────
  describe("requireProfessor()", () => {
    it("throws a redirect when unauthenticated", async () => {
      const req = makeGet("http://localhost/professor");
      await expect(requireProfessor(req)).rejects.toMatchObject({ status: 302 });
    });

    it("throws a redirect for a STUDENT", async () => {
      mockFindUnique.mockResolvedValue(MOCK_STUDENT as any);
      const cookie = await makeSessionCookie(MOCK_STUDENT.id, "STUDENT");
      const req    = makeGet("http://localhost/professor", cookie);
      await expect(requireProfessor(req)).rejects.toMatchObject({ status: 302 });
    });

    it("allows access for role PROFESSOR", async () => {
      mockFindUnique.mockResolvedValue(MOCK_PROFESSOR as any);
      const cookie = await makeSessionCookie(MOCK_PROFESSOR.id, "PROFESSOR");
      const req    = makeGet("http://localhost/professor", cookie);
      const user   = await requireProfessor(req);
      expect(user.role).toBe("PROFESSOR");
    });

    it("allows access for role ADMIN (admin can use professor routes)", async () => {
      mockFindUnique.mockResolvedValue(MOCK_ADMIN as any);
      const cookie = await makeSessionCookie(MOCK_ADMIN.id, "ADMIN");
      const req    = makeGet("http://localhost/professor", cookie);
      const user   = await requireProfessor(req);
      expect(user.role).toBe("ADMIN");
    });
  });

  // ─── requireStudent ───────────────────────────────────────────────────────
  describe("requireStudent()", () => {
    it("throws a redirect when unauthenticated", async () => {
      const req = makeGet("http://localhost/student");
      await expect(requireStudent(req)).rejects.toMatchObject({ status: 302 });
    });

    it("throws a redirect for an ADMIN", async () => {
      mockFindUnique.mockResolvedValue(MOCK_ADMIN as any);
      const cookie = await makeSessionCookie(MOCK_ADMIN.id, "ADMIN");
      const req    = makeGet("http://localhost/student", cookie);
      await expect(requireStudent(req)).rejects.toMatchObject({ status: 302 });
    });

    it("throws a redirect for a PROFESSOR", async () => {
      mockFindUnique.mockResolvedValue(MOCK_PROFESSOR as any);
      const cookie = await makeSessionCookie(MOCK_PROFESSOR.id, "PROFESSOR");
      const req    = makeGet("http://localhost/student", cookie);
      await expect(requireStudent(req)).rejects.toMatchObject({ status: 302 });
    });

    it("resolves with the student user record", async () => {
      mockFindUnique.mockResolvedValue(MOCK_STUDENT as any);
      const cookie = await makeSessionCookie(MOCK_STUDENT.id, "STUDENT");
      const req    = makeGet("http://localhost/student", cookie);
      const user   = await requireStudent(req);
      expect(user.studentId).toBe("STU-2024-001");
    });
  });
});
