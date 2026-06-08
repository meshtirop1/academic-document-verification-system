/**
 * Shared test utilities — request factories and session helpers.
 */
import { sessionStorage } from "~/utils/session.server";

// ─── Session ─────────────────────────────────────────────────────────────────

/**
 * Mint a real (signed) session cookie for a given user.
 * Use this to simulate an authenticated request in route tests.
 */
export async function makeSessionCookie(
  userId: string,
  role: string,
): Promise<string> {
  const session = await sessionStorage.getSession();
  session.set("userId", userId);
  session.set("role", role);
  return sessionStorage.commitSession(session);
}

// ─── Request factories ────────────────────────────────────────────────────────

/** Build a GET Request, optionally with a session cookie header. */
export function makeGet(url: string, cookie?: string): Request {
  return new Request(url, {
    method: "GET",
    headers: cookie ? { Cookie: cookie } : {},
  });
}

/**
 * Build a POST Request with FormData fields.
 * Use for standard (non-multipart) form submissions.
 */
export function makePost(
  url: string,
  fields: Record<string, string>,
  cookie?: string,
): Request {
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    body.append(key, value);
  }
  return new Request(url, {
    method: "POST",
    headers: cookie ? { Cookie: cookie } : {},
    body,
  });
}

// ─── Response helpers ─────────────────────────────────────────────────────────

/** Await and parse the JSON body of a Remix response. */
export async function parseJson<T = unknown>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

// ─── Common mock data ─────────────────────────────────────────────────────────

export const MOCK_ADMIN = {
  id: "admin-1",
  email: "admin@university.edu",
  password: "$2b$10$hashedpassword",
  name: "System Admin",
  role: "ADMIN",
  studentId: null,
  createdAt: new Date("2024-01-01"),
} as const;

export const MOCK_PROFESSOR = {
  id: "prof-1",
  email: "prof.smith@university.edu",
  password: "$2b$10$hashedpassword",
  name: "Professor Smith",
  role: "PROFESSOR",
  studentId: null,
  createdAt: new Date("2024-01-01"),
} as const;

export const MOCK_STUDENT = {
  id: "stu-1",
  email: "alice@university.edu",
  password: "$2b$10$hashedpassword",
  name: "Alice Johnson",
  role: "STUDENT",
  studentId: "STU-2024-001",
  createdAt: new Date("2024-01-01"),
} as const;

export const MOCK_CERT = {
  id: "cert-1",
  verificationId: "CERT-ABCD-1234-EFGH-5678",
  studentId: "STU-2024-001",
  studentName: "Alice Johnson",
  attendanceVerified: true,
  transcriptVerified: true,
  resultsVerified: true,
  fullyVerified: true,
  blockchainTxHash: "0xdeadbeef1234",
  issuedAt: new Date("2024-06-01"),
} as const;
