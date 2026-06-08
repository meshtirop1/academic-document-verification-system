import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Outlet, useLoaderData } from "@remix-run/react";
import { requireAdmin } from "~/utils/auth.server";
import { Sidebar } from "~/components/Sidebar";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAdmin(request);
  return json({ user: { name: user.name, role: user.role } });
}

export default function AdminLayout() {
  const { user } = useLoaderData<typeof loader>();
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar role={user.role as "ADMIN"} userName={user.name} />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
