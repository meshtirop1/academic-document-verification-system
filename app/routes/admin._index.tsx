import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { requireAdmin } from "~/utils/auth.server";
import { db } from "~/utils/db.server";
import { StatsCard } from "~/components/StatsCard";

export async function loader({ request }: LoaderFunctionArgs) {
  await requireAdmin(request);

  const [totalStudents, totalProfessors, totalDocuments, totalCertificates, recentDocs] =
    await Promise.all([
      db.user.count({ where: { role: "STUDENT" } }),
      db.user.count({ where: { role: "PROFESSOR" } }),
      db.document.count(),
      db.verificationCertificate.count({ where: { fullyVerified: true } }),
      db.document.findMany({
        orderBy: { uploadedAt: "desc" },
        take: 8,
        include: { uploadedBy: { select: { name: true } } },
      }),
    ]);

  return json({ totalStudents, totalProfessors, totalDocuments, totalCertificates, recentDocs });
}

export default function AdminDashboard() {
  const { totalStudents, totalProfessors, totalDocuments, totalCertificates, recentDocs } =
    useLoaderData<typeof loader>();

  return (
    <div className="p-8">
      <div className="page-header">
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="page-subtitle">System overview — Academic Integrity Verification System</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatsCard
          title="Total Students"
          value={totalStudents}
          accent="indigo"
          icon={<UsersIcon />}
        />
        <StatsCard
          title="Professors"
          value={totalProfessors}
          accent="blue"
          icon={<ProfIcon />}
        />
        <StatsCard
          title="Documents Uploaded"
          value={totalDocuments}
          accent="yellow"
          icon={<DocIcon />}
        />
        <StatsCard
          title="Verified Students"
          value={totalCertificates}
          subtitle="Fully certified"
          accent="green"
          icon={<CertIcon />}
        />
      </div>

      {/* Quick actions */}
      <div className="flex gap-3 mb-8">
        <Link to="/admin/users" className="btn-primary">
          <UsersIcon /> Manage Users
        </Link>
        <Link to="/verify" className="btn-secondary">
          <ShieldIcon /> Public Verifier
        </Link>
      </div>

      {/* Recent documents */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Recent Document Uploads</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Student ID", "Type", "Hash (first 16)", "Uploaded By", "Date", "TX"].map(
                  (h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentDocs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                    No documents uploaded yet.
                  </td>
                </tr>
              )}
              {recentDocs.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-xs text-gray-700">{doc.studentId}</td>
                  <td className="px-6 py-4">
                    <DocTypeBadge type={doc.docType} />
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-500">
                    {doc.fileHash.slice(0, 16)}…
                  </td>
                  <td className="px-6 py-4 text-gray-700">{doc.uploadedBy.name}</td>
                  <td className="px-6 py-4 text-gray-500">
                    {new Date(doc.uploadedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    {doc.txHash ? (
                      <span className="badge-green">On-chain</span>
                    ) : (
                      <span className="badge-gray">DB only</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DocTypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    ATTENDANCE: "badge-blue",
    TRANSCRIPT: "badge-indigo",
    RESULTS:    "badge-yellow",
  };
  const cls = map[type] ?? "badge-gray";
  // map to Tailwind classes manually
  const clsMap: Record<string, string> = {
    "badge-blue":   "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700",
    "badge-indigo": "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-brand-100 text-brand-700",
    "badge-yellow": "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700",
    "badge-gray":   "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600",
  };
  return <span className={clsMap[cls]}>{type}</span>;
}

function UsersIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
}
function ProfIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
}
function DocIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
}
function CertIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>;
}
function ShieldIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>;
}
