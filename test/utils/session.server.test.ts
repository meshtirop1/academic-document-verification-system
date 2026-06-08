/**
 * Unit tests for app/utils/session.server.ts
 *
 * Tests session creation, reading, and auth guards using real
 * cookie-based sessions (no database dependency).
 */
import { describe, it, expect } from "vitest";
import {
  getUserId,
  getUserRole,
  getUserSession,
  requireUserId,
} from "~/utils/session.server";
import { makeGet, makeSessionCookie } from "../helpers";

describe("session.server", () => {
  // ─── getUserSession ────────────────────────────────────────────────────────
  describe("getUserSession()", () => {
    it("returns an empty session for a request with no cookie", async () => {
      const req = makeGet("http://localhost/");
      const session = await getUserSession(req);
      expect(session.get("userId")).toBeUndefined();
      expect(session.get("role")).toBeUndefined();
    });

    it("returns a populated session for an authenticated request", async () => {
      const cookie = await makeSessionCookie("user-42", "PROFESSOR");
      const req    = makeGet("http://localhost/professor", cookie);
      const session = await getUserSession(req);
      expect(session.get("userId")).toBe("user-42");
      expect(session.get("role")).toBe("PROFESSOR");
    });
  });

  // ─── getUserId ────────────────────────────────────────────────────────────
  describe("getUserId()", () => {
    it("returns null when no session cookie is present", async () => {
      const req = makeGet("http://localhost/");
      expect(await getUserId(req)).toBeNull();
    });

    it("returns the userId stored in the session", async () => {
      const cookie = await makeSessionCookie("user-99", "STUDENT");
      const req    = makeGet("http://localhost/student", cookie);
      expect(await getUserId(req)).toBe("user-99");
    });

    it("returns null for a request with an invalid/tampered cookie", async () => {
      const req = makeGet("http://localhost/", "Cookie: __aivs_session=tampered-garbage");
      expect(await getUserId(req)).toBeNull();
    });
  });

  // ─── getUserRole ─────────────────────────────────────────────────────────
  describe("getUserRole()", () => {
    it("returns null when not authenticated", async () => {
      const req = makeGet("http://localhost/");
      expect(await getUserRole(req)).toBeNull();
    });

    it("returns ADMIN role correctly", async () => {
      const cookie = await makeSessionCookie("admin-1", "ADMIN");
      const req    = makeGet("http://localhost/admin", cookie);
      expect(await getUserRole(req)).toBe("ADMIN");
    });

    it("returns STUDENT role correctly", async () => {
      const cookie = await makeSessionCookie("stu-1", "STUDENT");
      const req    = makeGet("http://localhost/student", cookie);
      expect(await getUserRole(req)).toBe("STUDENT");
    });
  });

  // ─── requireUserId ────────────────────────────────────────────────────────
  describe("requireUserId()", () => {
    it("throws a 302 redirect to /login when unauthenticated", async () => {
      const req = makeGet("http://localhost/admin");
      await expect(requireUserId(req)).rejects.toMatchObject({ status: 302 });
    });

    it("resolves with the userId when the session is valid", async () => {
      const cookie = await makeSessionCookie("user-xyz", "ADMIN");
      const req    = makeGet("http://localhost/admin", cookie);
      expect(await requireUserId(req)).toBe("user-xyz");
    });

    it("respects a custom redirectTo parameter", async () => {
      const req = makeGet("http://localhost/some-protected-route");
      const thrown = await requireUserId(req, "/custom-login").catch((e) => e);
      expect(thrown.status).toBe(302);
      expect(thrown.headers.get("Location")).toBe("/custom-login");
    });
  });
});
