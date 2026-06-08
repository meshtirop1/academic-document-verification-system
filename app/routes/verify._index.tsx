import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Form, Link, useLoaderData, useNavigation } from "@remix-run/react";
import { db } from "~/utils/db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const q   = url.searchParams.get("q")?.trim() ?? "";

  if (!q) return json({ q: "", cert: null, student: null });

  let cert = await db.verificationCertificate.findUnique({ where: { verificationId: q } });
  if (!cert) cert = await db.verificationCertificate.findUnique({ where: { studentId: q } });

  const student = cert
    ? await db.user.findFirst({
        where: { studentId: cert.studentId },
        select: { name: true, email: true, studentId: true },
      })
    : null;

  return json({ q, cert, student });
}

export default function VerifyIndex() {
  const { q, cert, student } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const searching  = navigation.state === "loading";

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900">Verify Academic Record</h1>
        <p className="text-gray-500 mt-2">
          Enter a Student ID or Verification ID to check authenticity on the blockchain.
        </p>
      </div>

      <Form method="get" className="flex gap-3 mb-10">
        <input
          name="q"
          defaultValue={q}
          className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-sm"
          placeholder="Enter Student ID (e.g. STU-2024-001) or Verification ID…"
        />
        <button
          type="submit"
          disabled={searching}
          className="btn-primary px-6 py-3 rounded-xl shadow-sm"
        >
          {searching ? "Searching…" : "Verify"}
        </button>
      </Form>

      {!q && (
        <div className="text-center py-16 text-gray-400">
          <svg className="mx-auto w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <p>Search for a student to see their verification status.</p>
        </div>
      )}

      {q && !cert && (
        <div className="card p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Record Not Found</h2>
          <p className="text-gray-500 mt-2">
            No verified academic record found for &ldquo;{q}&rdquo;.
          </p>
        </div>
      )}

      {cert && student && (
        <div className="space-y-4">
          <div className={`card p-6 border-2 ${cert.fullyVerified ? "border-green-400 bg-green-50" : "border-yellow-400 bg-yellow-50"}`}>
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${cert.fullyVerified ? "bg-green-500" : "bg-yellow-400"}`}>
                {cert.fullyVerified ? (
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <div>
                <p className="font-bold text-xl text-gray-900">{student.name}</p>
                <p className="text-gray-600 text-sm">{student.studentId}</p>
                <p className={`font-semibold mt-1 ${cert.fullyVerified ? "text-green-700" : "text-yellow-700"}`}>
                  {cert.fullyVerified ? "Fully Verified Academic Record" : "Partial — Verification Incomplete"}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <DocCheck label="Attendance"   ok={cert.attendanceVerified} />
            <DocCheck label="Transcript"   ok={cert.transcriptVerified} />
            <DocCheck label="Exam Results" ok={cert.resultsVerified} />
          </div>

          {cert.fullyVerified && (
            <div className="card p-6 space-y-3">
              <h3 className="font-semibold text-gray-900">Certificate Details</h3>
              <dl className="text-sm space-y-2">
                <Row label="Verification ID" value={cert.verificationId} mono />
                <Row label="Issued" value={new Date(cert.issuedAt).toLocaleDateString("en-US", { dateStyle: "long" })} />
                {cert.blockchainTxHash && <Row label="Blockchain TX" value={cert.blockchainTxHash} mono />}
              </dl>
              <Link to={`/verify/${cert.verificationId}`} className="btn-primary mt-4 inline-flex">
                View Full Certificate
              </Link>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

function DocCheck({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className={`card p-4 text-center border-2 ${ok ? "border-green-300 bg-green-50" : "border-gray-200"}`}>
      <div className={`w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center ${ok ? "bg-green-500" : "bg-gray-200"}`}>
        {ok ? (
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </div>
      <p className="text-sm font-medium text-gray-800">{label}</p>
      <p className={`text-xs mt-0.5 ${ok ? "text-green-600" : "text-gray-400"}`}>
        {ok ? "Verified" : "Not verified"}
      </p>
    </div>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-4">
      <dt className="w-36 shrink-0 text-gray-500 font-medium">{label}</dt>
      <dd className={`text-gray-800 break-all ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}
