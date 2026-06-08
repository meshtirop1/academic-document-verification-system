import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import bcrypt from "bcryptjs";
import { requireAdmin } from "~/utils/auth.server";
import { db } from "~/utils/db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await requireAdmin(request);
  const users = await db.user.findMany({ orderBy: { createdAt: "desc" } });
  return json({ users });
}

export async function action({ request }: ActionFunctionArgs) {
  await requireAdmin(request);
  const formData = await request.formData();
  const intent   = String(formData.get("intent") ?? "");

  if (intent === "create") {
    const name      = String(formData.get("name") ?? "").trim();
    const email     = String(formData.get("email") ?? "").trim();
    const password  = String(formData.get("password") ?? "");
    const role      = String(formData.get("role") ?? "STUDENT") as "ADMIN" | "PROFESSOR" | "STUDENT";
    const studentId = String(formData.get("studentId") ?? "").trim() || null;

    if (!name || !email || !password) {
      return json({ error: "Name, email, and password are required." }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) return json({ error: "Email already in use." }, { status: 400 });

    const hashed = await bcrypt.hash(password, 10);
    await db.user.create({
      data: { name, email, password: hashed, role, studentId: studentId || undefined },
    });
    return json({ success: "User created." });
  }

  if (intent === "delete") {
    const id = String(formData.get("id") ?? "");
    await db.user.delete({ where: { id } }).catch(() => null);
    return json({ success: "User deleted." });
  }

  return json({ error: "Unknown action." }, { status: 400 });
}

export default function AdminUsers() {
  const { users }    = useLoaderData<typeof loader>();
  const actionData   = useActionData<typeof action>();
  const navigation   = useNavigation();
  const submitting   = navigation.state === "submitting";

  return (
    <div className="p-8">
      <div className="page-header">
        <h1 className="page-title">Manage Users</h1>
        <p className="page-subtitle">Create and remove system users</p>
      </div>

      {/* Flash messages */}
      {actionData && "error" in actionData && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {actionData.error}
        </div>
      )}
      {actionData && "success" in actionData && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          {actionData.success}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Create user form */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Add New User</h2>
          <Form method="post" className="space-y-4">
            <input type="hidden" name="intent" value="create" />
            <div>
              <label className="label">Full Name</label>
              <input name="name" type="text" required className="input" placeholder="John Doe" />
            </div>
            <div>
              <label className="label">Email</label>
              <input name="email" type="email" required className="input" placeholder="john@university.edu" />
            </div>
            <div>
              <label className="label">Password</label>
              <input name="password" type="password" required className="input" placeholder="Min. 6 characters" />
            </div>
            <div>
              <label className="label">Role</label>
              <select name="role" className="input">
                <option value="STUDENT">Student</option>
                <option value="PROFESSOR">Professor</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div>
              <label className="label">Student ID (if student)</label>
              <input name="studentId" type="text" className="input" placeholder="STU-2024-001" />
            </div>
            <button type="submit" disabled={submitting} className="btn-primary w-full justify-center">
              {submitting ? "Creating…" : "Create User"}
            </button>
          </Form>
        </div>

        {/* Users table */}
        <div className="xl:col-span-2 card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">All Users ({users.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["Name", "Email", "Role", "Student ID", "Joined", "Action"].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{u.name}</td>
                    <td className="px-6 py-4 text-gray-600">{u.email}</td>
                    <td className="px-6 py-4">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">
                      {u.studentId ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      {u.role !== "ADMIN" && (
                        <Form method="post" onSubmit={(e) => !confirm("Delete this user?") && e.preventDefault()}>
                          <input type="hidden" name="intent" value="delete" />
                          <input type="hidden" name="id" value={u.id} />
                          <button type="submit" className="text-red-500 hover:text-red-700 text-xs font-medium">
                            Delete
                          </button>
                        </Form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    ADMIN:     "bg-brand-100 text-brand-700",
    PROFESSOR: "bg-blue-100 text-blue-700",
    STUDENT:   "bg-green-100 text-green-700",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${map[role] ?? "bg-gray-100 text-gray-600"}`}>
      {role}
    </span>
  );
}
