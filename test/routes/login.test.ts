/**
 * Tests for the /login route (loader + action)
 *
 * DB and bcrypt are mocked; real session cookies are used.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeGet, makePost, makeSessionCookie, parseJson, MOCK_STUDENT, MOCK_ADMIN } from "../helpers";

// ── Mocks ─────────────────────────────────────────────────────────────────────
vi.mock("~/utils/db.server", () => ({
  db: {
    user: { findUnique: vi.fn() },
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
    hash:    vi.fn(),
  },
}));

import { db }           from "~/utils/db.server";
import bcrypt           from "bcryptjs";
import { loader, action } from "~/routes/login";

const mockFindUnique = vi.mocked(db.user.findUnique);
const mockCompare    = vi.mocked(bcrypt.compare);

const args = (req: Request) => ({ request: req, params: {}, context: {} });

// ────────────────────────────────────────────────────────────────────────────

describe("Login Route", () => {
  beforeEach(() => vi.clearAllMocks());

  // ─── loader ───────────────────────────────────────────────────────────────
  describe("loader", () => {
    it("returns null for an unauthenticated visitor", async () => {
      const req = makeGet("http://localhost/login");
      const res = await loader(args(req));
      expect(res).toBeNull();
    });

    it("redirects an already-logged-in user away from the login page", async () => {
      const cookie = await makeSessionCookie(MOCK_STUDENT.id, "STUDENT");
      const req    = makeGet("http://localhost/login", cookie);
      const res    = await loader(args(req));
      expect((res as Response).status).toBe(302);
    });
  });

  // ─── action ───────────────────────────────────────────────────────────────
  describe("action — validation", () => {
    it("returns 400 when both email and password are empty", async () => {
      const req = makePost("http://localhost/login", { email: "", password: "" });
      const res = await action(args(req));
      expect(res.status).toBe(400);
      const body = await parseJson<{ error: string }>(res);
      expect(body.error).toMatch(/required/i);
    });

    it("returns 400 when email is missing", async () => {
      const req = makePost("http://localhost/login", { email: "", password: "pass" });
      const res = await action(args(req));
      expect(res.status).toBe(400);
    });

    it("returns 400 when password is missing", async () => {
      const req = makePost("http://localhost/login", { email: "a@b.com", password: "" });
      const res = await action(args(req));
      expect(res.status).toBe(400);
    });
  });

  describe("action — authentication", () => {
    it("returns 401 when the email is not in the database", async () => {
      mockFindUnique.mockResolvedValue(null);
      const req = makePost("http://localhost/login", {
        email: "nobody@test.com",
        password: "anything",
      });
      const res  = await action(args(req));
      expect(res.status).toBe(401);
      const body = await parseJson<{ error: string }>(res);
      expect(body.error).toMatch(/invalid/i);
    });

    it("returns 401 when the password does not match", async () => {
      mockFindUnique.mockResolvedValue(MOCK_STUDENT as any);
      mockCompare.mockResolvedValue(false as any);
      const req = makePost("http://localhost/login", {
        email: MOCK_STUDENT.email,
        password: "wrongpassword",
      });
      const res = await action(args(req));
      expect(res.status).toBe(401);
    });

    it("redirects to /student after a successful student login", async () => {
      mockFindUnique.mockResolvedValue(MOCK_STUDENT as any);
      mockCompare.mockResolvedValue(true as any);
      const req = makePost("http://localhost/login", {
        email:    MOCK_STUDENT.email,
        password: "student123",
      });
      const res = await action(args(req));
      expect(res.status).toBe(302);
      expect(res.headers.get("Location")).toBe("/student");
      // Session cookie must be set on successful login
      expect(res.headers.get("Set-Cookie")).toBeTruthy();
    });

    it("redirects to /admin after a successful admin login", async () => {
      mockFindUnique.mockResolvedValue(MOCK_ADMIN as any);
      mockCompare.mockResolvedValue(true as any);
      const req = makePost("http://localhost/login", {
        email:    MOCK_ADMIN.email,
        password: "admin123",
      });
      const res = await action(args(req));
      expect(res.status).toBe(302);
      expect(res.headers.get("Location")).toBe("/admin");
    });
  });
});
