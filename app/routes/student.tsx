import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Outlet, useLoaderData } from "@remix-run/react";
import { requireStudent } from "~/utils/auth.server";
import { Sidebar } from "~/components/Sidebar";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireStudent(request);
  return json({ user: { name: user.name, role: user.role } });
}

export default function StudentLayout() {
  const { user } = useLoaderData<typeof loader>();
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar role={user.role as "STUDENT"} userName={user.name} />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
