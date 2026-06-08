import { redirect } from "@remix-run/node";
import { db } from "./db.server";
import { getUserSession, requireUserId } from "./session.server";

export async function getUser(request: Request) {
  const session = await getUserSession(request);
  const userId = session.get("userId");
  if (!userId) return null;
  try {
    return await db.user.findUnique({ where: { id: userId } });
  } catch {
    return null;
  }
}

export async function requireUser(request: Request) {
  const userId = await requireUserId(request);
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw redirect("/login");
  return user;
}

export async function requireAdmin(request: Request) {
  const user = await requireUser(request);
  if (user.role !== "ADMIN") throw redirect("/login");
  return user;
}

export async function requireProfessor(request: Request) {
  const user = await requireUser(request);
  if (user.role !== "PROFESSOR" && user.role !== "ADMIN") throw redirect("/login");
  return user;
}

export async function requireStudent(request: Request) {
  const user = await requireUser(request);
  if (user.role !== "STUDENT") throw redirect("/student");
  return user;
}
