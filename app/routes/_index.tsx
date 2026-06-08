import { redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { getUserSession } from "~/utils/session.server";
import { db } from "~/utils/db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getUserSession(request);
  const userId = session.get("userId");

  if (!userId) return redirect("/login");

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return redirect("/login");

  const roleRoutes = { ADMIN: "/admin", PROFESSOR: "/professor", STUDENT: "/student" };
  return redirect(roleRoutes[user.role] ?? "/login");
}

export default function Index() {
  return null;
}
