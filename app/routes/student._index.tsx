import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { requireStudent } from "~/utils/auth.server";
import { db } from "~/utils/db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireStudent(request);

  if (!user.studentId) {
    return json({ user, docs: [], cert: null });
  }

  const [docs, cert] = await Promise.all([
    db.document.findMany({ where: { studentId: user.studentId }, orderBy: { uploadedAt: "desc" } }),
    db.verificationCertificate.findUnique({ where: { studentId: user.studentId } }),
  ]);

  return json({ user, docs, cert });
}

export default function StudentDashboard() {
  const { user, docs, cert } = useLoaderData<typeof loader>();

  const has = (type: string) => docs.some((d) => d.docType === type);

  return (
    <div className="p-8">
      <div className="page-header">
        <h1 className="page-title">My Academic Record</h1>
        <p className="page-subtitle">
          {user.name} &bull; {user.studentId ?? "No student ID assigned"}
        </p>
      </div>

      {/* Verification status cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatusCard label="Attendance" verified={has("ATTENDANCE")} />
        <StatusCard label="Transcript" verified={has("TRANSCRIPT")} />
        <StatusCard label="Exam Results" verified={has("RESULTS")} />
      </div>

      {/* Certificate banner */}
      {cert?.fullyVerified ? (
        <div className="mb-8 p-6 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl text-white shadow-lg">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                <span className="font-bold text-lg">Fully Verified Academic Record</span>
              </div>
              <p className="text-green-100 text-sm">
                Verification ID: <span className="font-mono">{cert.verificationId}</span>
              </p>
              <p className="text-green-100 text-sm mt-0.5">
                Issued: {new Date(cert.issuedAt).toLocaleDateString("en-US", { dateStyle: "long" })}
              </p>
            </div>
            <Link
              to={`/verify/${cert.verificationId}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-green-700 font-semibold rounded-lg text-sm hover:bg-green-50 transition-colors shadow"
            >
              View Certificate
            </Link>
          </div>
        </div>
      ) : (
        <div className="mb-8 p-5 bg-yellow-50 border border-yellow-200 rounded-xl">
          <p className="font-medium text-yellow-800">Certificate not yet issued</p>
          <p className="text-sm text-yellow-700 mt-1">
            Your certificate will be automatically generated once your professor uploads all three
            document types (Attendance, Transcript, Exam Results).
          </p>
        </div>
      )}

      {/* Documents table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Uploaded Documents</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {["Type", "Original File", "SHA-256 Hash", "Blockchain TX", "Date"].map((h) => (
                <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {docs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                  No documents have been uploaded yet.
                </td>
              </tr>
            )}
            {docs.map((doc) => (
              <tr key={doc.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <TypeBadge type={doc.docType} />
                </td>
                <td className="px-6 py-4 text-gray-700">{doc.originalFilename}</td>
                <td className="px-6 py-4 font-mono text-xs text-gray-500 max-w-xs truncate">
                  {doc.fileHash}
                </td>
                <td className="px-6 py-4">
                  {doc.txHash ? (
                    <span className="badge-green">
                      <CheckIcon /> On-chain
                    </span>
                  ) : (
                    <span className="badge-gray">DB only</span>
                  )}
                </td>
                <td className="px-6 py-4 text-gray-500">
                  {new Date(doc.uploadedAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusCard({ label, verified }: { label: string; verified: boolean }) {
  return (
    <div
      className={`rounded-xl border-2 p-5 transition-all ${
        verified
          ? "border-green-300 bg-green-50"
          : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center ${
            verified ? "bg-green-500" : "bg-gray-200"
          }`}
        >
          {verified ? (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>
        <div>
          <p className="font-semibold text-gray-900">{label}</p>
          <p className={`text-xs mt-0.5 ${verified ? "text-green-600" : "text-gray-400"}`}>
            {verified ? "Verified" : "Awaiting upload"}
          </p>
        </div>
      </div>
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    ATTENDANCE: "bg-blue-100 text-blue-700",
    TRANSCRIPT: "bg-brand-100 text-brand-700",
    RESULTS:    "bg-yellow-100 text-yellow-700",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${map[type] ?? "bg-gray-100 text-gray-600"}`}>
      {type}
    </span>
  );
}
function CheckIcon() {
  return <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>;
}
