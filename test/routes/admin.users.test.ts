/**
 * Tests for /admin/users route (loader + action)
 *
 * Covers: user listing, create-user, delete-user, and authorization.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  makeGet,
  makePost,
  makeSessionCookie,
  parseJson,
  MOCK_ADMIN,
  MOCK_STUDENT,
} from "../helpers";

// ── Mocks ─────────────────────────────────────────────────────────────────────
vi.mock("~/utils/db.server", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      findMany:   vi.fn(),
      create:     vi.fn(),
      delete:     vi.fn(),
    },
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
    hash:    vi.fn().mockResolvedValue("$2b$10$hashedpassword"),
  },
}));

import { db }                 from "~/utils/db.server";
import { loader, action }      from "~/routes/admin.users";

const mockFindUnique = vi.mocked(db.user.findUnique);
const mockFindMany   = vi.mocked(db.user.findMany);
const mockCreate     = vi.mocked(db.user.create);
const mockDelete     = vi.mocked(db.user.delete);

const args = (req: Request) => ({ request: req, params: {}, context: {} });

async function adminCookie() {
  return makeSessionCookie(MOCK_ADMIN.id, "ADMIN");
}

// ────────────────────────────────────────────────────────────────────────────

describe("Admin Users Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: auth check succeeds with admin user
    mockFindUnique.mockResolvedValue(MOCK_ADMIN as any);
    mockFindMany.mockResolvedValue([MOCK_ADMIN] as any);
  });

  // ─── loader ───────────────────────────────────────────────────────────────
  describe("loader", () => {
    it("throws a redirect for an unauthenticated request", async () => {
      const req = makeGet("http://localhost/admin/users");
      await expect(loader(args(req))).rejects.toMatchObject({ status: 302 });
    });

    it("throws a redirect when a non-admin (STUDENT) tries to access", async () => {
      mockFindUnique.mockResolvedValue(MOCK_STUDENT as any);
      const cookie = await makeSessionCookie(MOCK_STUDENT.id, "STUDENT");
      const req    = makeGet("http://localhost/admin/users", cookie);
      await expect(loader(args(req))).rejects.toMatchObject({ status: 302 });
    });

    it("returns the list of all users for an admin", async () => {
      const cookie = await adminCookie();
      const req    = makeGet("http://localhost/admin/users", cookie);
      const res    = await loader(args(req));
      const body   = await parseJson<{ users: unknown[] }>(res);
      expect(Array.isArray(body.users)).toBe(true);
      expect(body.users).toHaveLength(1);
    });
  });

  // ─── action — create ──────────────────────────────────────────────────────
  describe("action — create user", () => {
    it("returns 400 when name is missing", async () => {
      const cookie = await adminCookie();
      const req    = makePost(
        "http://localhost/admin/users",
        { intent: "create", name: "", email: "new@test.com", password: "pass123", role: "STUDENT", studentId: "" },
        cookie,
      );
      const res  = await action(args(req));
      expect(res.status).toBe(400);
      const body = await parseJson<{ error: string }>(res);
      expect(body.error).toMatch(/required/i);
    });

    it("returns 400 when email is missing", async () => {
      const cookie = await adminCookie();
      const req    = makePost(
        "http://localhost/admin/users",
        { intent: "create", name: "Test", email: "", password: "pass123", role: "STUDENT", studentId: "" },
        cookie,
      );
      const res = await action(args(req));
      expect(res.status).toBe(400);
    });

    it("returns 400 when password is missing", async () => {
      const cookie = await adminCookie();
      const req    = makePost(
        "http://localhost/admin/users",
        { intent: "create", name: "Test", email: "x@x.com", password: "", role: "STUDENT", studentId: "" },
        cookie,
      );
      const res = await action(args(req));
      expect(res.status).toBe(400);
    });

    it("returns 400 when the email is already in use", async () => {
      // Sequence: 1st call = admin auth check, 2nd call = email uniqueness check → existing user
      mockFindUnique
        .mockResolvedValueOnce(MOCK_ADMIN as any)
        .mockResolvedValueOnce(MOCK_STUDENT as any);

      const cookie = await adminCookie();
      const req    = makePost(
        "http://localhost/admin/users",
        {
          intent: "create",
          name: "Duplicate",
          email: MOCK_STUDENT.email,
          password: "pass123",
          role: "STUDENT",
          studentId: "STU-DUP",
        },
        cookie,
      );
      const res  = await action(args(req));
      expect(res.status).toBe(400);
      const body = await parseJson<{ error: string }>(res);
      expect(body.error).toMatch(/already in use/i);
    });

    it("creates a new user and returns a success message", async () => {
      // Sequence: 1st call = admin auth, 2nd call = email check (null = available)
      mockFindUnique
        .mockResolvedValueOnce(MOCK_ADMIN as any)
        .mockResolvedValueOnce(null);
      mockCreate.mockResolvedValue({ id: "new-user-id", role: "STUDENT" } as any);

      const cookie = await adminCookie();
      const req    = makePost(
        "http://localhost/admin/users",
        {
          intent:    "create",
          name:      "New Student",
          email:     "newstudent@test.com",
          password:  "securepassword",
          role:      "STUDENT",
          studentId: "STU-NEW-001",
        },
        cookie,
      );
      const res  = await action(args(req));
      const body = await parseJson<{ success: string }>(res);
      expect(body.success).toBeDefined();
    });

    it("hashes the password before storing it", async () => {
      mockFindUnique
        .mockResolvedValueOnce(MOCK_ADMIN as any)
        .mockResolvedValueOnce(null);
      mockCreate.mockResolvedValue({ id: "uid" } as any);

      const cookie = await adminCookie();
      const req    = makePost(
        "http://localhost/admin/users",
        {
          intent:    "create",
          name:      "Hash Test",
          email:     "hash@test.com",
          password:  "plaintext",
          role:      "PROFESSOR",
          studentId: "",
        },
        cookie,
      );
      await action(args(req));

      // Ensure db.user.create was not called with the plaintext password
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            password: expect.not.stringContaining("plaintext"),
          }),
        }),
      );
    });
  });

  // ─── action — delete ──────────────────────────────────────────────────────
  describe("action — delete user", () => {
    it("deletes the specified user and returns success", async () => {
      mockDelete.mockResolvedValue(MOCK_STUDENT as any);
      const cookie = await adminCookie();
      const req    = makePost(
        "http://localhost/admin/users",
        { intent: "delete", id: MOCK_STUDENT.id },
        cookie,
      );
      const res  = await action(args(req));
      const body = await parseJson<{ success: string }>(res);
      expect(body.success).toBeDefined();
      expect(mockDelete).toHaveBeenCalledWith({ where: { id: MOCK_STUDENT.id } });
    });
  });

  // ─── action — unknown intent ───────────────────────────────────────────────
  describe("action — unknown intent", () => {
    it("returns 400 for an unknown action intent", async () => {
      const cookie = await adminCookie();
      const req    = makePost(
        "http://localhost/admin/users",
        { intent: "hack" },
        cookie,
      );
      const res = await action(args(req));
      expect(res.status).toBe(400);
      const body = await parseJson<{ error: string }>(res);
      expect(body.error).toMatch(/unknown/i);
    });
  });
});
