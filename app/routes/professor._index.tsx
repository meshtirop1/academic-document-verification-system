import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { requireProfessor } from "~/utils/auth.server";
import { db } from "~/utils/db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await requireProfessor(request);

  const students = await db.user.findMany({
    where: { role: "STUDENT" },
    orderBy: { name: "asc" },
  });

  const documents = await db.document.findMany({
    where: { studentId: { in: students.map((s) => s.studentId!).filter(Boolean) } },
  });

  const certificates = await db.verificationCertificate.findMany({
    where: { studentId: { in: students.map((s) => s.studentId!).filter(Boolean) } },
  });

  const studentsWithStatus = students
    .filter((s) => s.studentId)
    .map((s) => {
      const sid  = s.studentId!;
      const docs = documents.filter((d) => d.studentId === sid);
      const cert = certificates.find((c) => c.studentId === sid);
      return {
        id:         s.id,
        name:       s.name,
        studentId:  sid,
        attendance: docs.some((d) => d.docType === "ATTENDANCE"),
        transcript: docs.some((d) => d.docType === "TRANSCRIPT"),
        results:    docs.some((d) => d.docType === "RESULTS"),
        verified:   cert?.fullyVerified ?? false,
      };
    });

  return json({ studentsWithStatus });
}

export default function ProfessorDashboard() {
  const { studentsWithStatus } = useLoaderData<typeof loader>();

  const totalVerified = studentsWithStatus.filter((s) => s.verified).length;

  return (
    <div className="p-8">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Professor Dashboard</h1>
          <p className="page-subtitle">Upload and manage student academic records</p>
        </div>
        <Link to="/professor/upload" className="btn-primary">
          <UploadIcon /> Upload Document
        </Link>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <SummaryCard label="Total Students" value={studentsWithStatus.length} color="brand" />
        <SummaryCard label="Fully Verified" value={totalVerified} color="green" />
        <SummaryCard
          label="Pending Verification"
          value={studentsWithStatus.length - totalVerified}
          color="yellow"
        />
      </div>

      {/* Students table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Students</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Student", "Student ID", "Attendance", "Transcript", "Results", "Status", "Action"].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {studentsWithStatus.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                    No students found. Add students from the Admin panel.
                  </td>
                </tr>
              )}
              {studentsWithStatus.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{s.name}</td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-600">{s.studentId}</td>
                  <td className="px-6 py-4"><VerBadge ok={s.attendance} /></td>
                  <td className="px-6 py-4"><VerBadge ok={s.transcript} /></td>
                  <td className="px-6 py-4"><VerBadge ok={s.results} /></td>
                  <td className="px-6 py-4">
                    {s.verified ? (
                      <span className="badge-green">
                        <CheckIcon /> Verified
                      </span>
                    ) : (
                      <span className="badge-yellow">Pending</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      to={`/professor/upload?studentId=${s.studentId}`}
                      className="text-brand-600 hover:text-brand-800 text-xs font-medium"
                    >
                      Upload
                    </Link>
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

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  const bg: Record<string, string> = {
    brand:  "bg-brand-50 border-brand-200",
    green:  "bg-green-50 border-green-200",
    yellow: "bg-yellow-50 border-yellow-200",
  };
  const txt: Record<string, string> = {
    brand:  "text-brand-700",
    green:  "text-green-700",
    yellow: "text-yellow-700",
  };
  return (
    <div className={`rounded-xl border p-5 ${bg[color]}`}>
      <p className={`text-3xl font-bold ${txt[color]}`}>{value}</p>
      <p className="text-sm text-gray-600 mt-1">{label}</p>
    </div>
  );
}

function VerBadge({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="badge-green"><CheckIcon /></span>
  ) : (
    <span className="badge-gray">Missing</span>
  );
}
function CheckIcon() {
  return <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>;
}
function UploadIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>;
}
