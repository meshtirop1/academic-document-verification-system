import { Link, Outlet } from "@remix-run/react";

export default function VerifyLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-brand-950 text-white px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 14l9-5-9-5-9 5 9 5z" />
          </svg>
        </div>
        <Link to="/verify" className="font-bold hover:text-brand-200">AIVS</Link>
        <span className="text-brand-300 text-sm">Public Verification Portal</span>
        <Link to="/login" className="ml-auto text-brand-300 hover:text-white text-sm">
          Sign In
        </Link>
      </header>

      <Outlet />
    </div>
  );
}
