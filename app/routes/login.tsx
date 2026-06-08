import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import bcrypt from "bcryptjs";
import { db } from "~/utils/db.server";
import { createUserSession, getUserId } from "~/utils/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await getUserId(request);
  if (userId) return redirect("/");
  return null;
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email    = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return json({ error: "Email and password are required." }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user) return json({ error: "Invalid email or password." }, { status: 401 });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return json({ error: "Invalid email or password." }, { status: 401 });

  const roleRoutes = { ADMIN: "/admin", PROFESSOR: "/professor", STUDENT: "/student" };
  return createUserSession(user.id, user.role, roleRoutes[user.role]);
}

export default function Login() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submitting = navigation.state === "submitting";

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-500 rounded-2xl mb-4 shadow-lg">
            <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 14l9-5-9-5-9 5 9 5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">AIVS</h1>
          <p className="text-brand-300 text-sm mt-1">Academic Integrity Verification System</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Sign in</h2>
          <p className="text-sm text-gray-500 mb-6">Enter your university credentials</p>

          {actionData?.error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {actionData.error}
            </div>
          )}

          <Form method="post" className="space-y-4">
            <div>
              <label htmlFor="email" className="label">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="input"
                placeholder="you@university.edu"
              />
            </div>
            <div>
              <label htmlFor="password" className="label">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="input"
                placeholder="••••••••"
              />
            </div>
            <button type="submit" disabled={submitting} className="btn-primary w-full justify-center py-3 mt-2">
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </Form>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center font-medium mb-2">Demo accounts</p>
            <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="font-semibold text-gray-700">Admin</p>
                <p>admin@university.edu</p>
                <p className="text-gray-400">admin123</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="font-semibold text-gray-700">Professor</p>
                <p>prof.smith@</p>
                <p className="text-gray-400">professor123</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="font-semibold text-gray-700">Student</p>
                <p>alice@university.edu</p>
                <p className="text-gray-400">student123</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-brand-400 text-xs mt-6">
          Secured by blockchain &bull; Tamper-proof verification
        </p>
      </div>
    </div>
  );
}
