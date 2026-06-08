import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import QRCode from "qrcode";
import { db } from "~/utils/db.server";

async function downloadPDF() {
  const { default: html2canvas } = await import("html2canvas");
  const { jsPDF } = await import("jspdf");

  const el = document.getElementById("certificate");
  if (!el) return;

  const canvas = await html2canvas(el, { scale: 2, useCORS: true });
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [canvas.width / 2, canvas.height / 2] });
  pdf.addImage(imgData, "PNG", 0, 0, canvas.width / 2, canvas.height / 2);
  pdf.save("AIVS-Certificate.pdf");
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const id = params.id ?? "";

  // Try verificationId first, then studentId
  let cert = await db.verificationCertificate.findUnique({ where: { verificationId: id } });
  if (!cert) cert = await db.verificationCertificate.findUnique({ where: { studentId: id } });

  if (!cert) {
    throw new Response("Certificate not found", { status: 404 });
  }

  const appUrl = process.env.APP_URL || "http://localhost:5173";
  const verifyUrl = `${appUrl}/verify/${cert.verificationId}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 200,
    margin: 2,
    color: { dark: "#1e1b4b", light: "#ffffff" },
  });

  return json({ cert, qrDataUrl, verifyUrl });
}

export default function CertificatePage() {
  const { cert, qrDataUrl, verifyUrl } = useLoaderData<typeof loader>();

  const issuedDate = new Date(cert.issuedAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="bg-gray-100 py-8 px-4 min-h-screen">
      {/* Back link */}
      <div className="max-w-4xl mx-auto mb-4 flex gap-3 no-print">
        <Link to="/verify" className="btn-secondary text-sm">
          ← Back to Verifier
        </Link>
        <button
          onClick={() => window.print()}
          className="btn-secondary text-sm"
        >
          Print Certificate
        </button>
        <button
          onClick={downloadPDF}
          className="btn-primary text-sm"
        >
          Download PDF
        </button>
      </div>

      {/* Certificate */}
      <div
        id="certificate"
        className="max-w-4xl mx-auto bg-white shadow-2xl rounded-2xl overflow-hidden"
        style={{ fontFamily: "'Times New Roman', Georgia, serif" }}
      >
        {/* Header band */}
        <div className="bg-brand-950 px-10 py-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-brand-500 rounded-full flex items-center justify-center">
              <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            </div>
            <div>
              <p className="text-white font-bold text-xl" style={{ fontFamily: "Inter, sans-serif" }}>
                University Academic Authority
              </p>
              <p className="text-brand-300 text-sm" style={{ fontFamily: "Inter, sans-serif" }}>
                Academic Integrity Verification System
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-brand-300 text-xs" style={{ fontFamily: "Inter, sans-serif" }}>Document No.</p>
            <p className="text-white font-mono text-sm">{cert.verificationId.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>

        {/* Gold divider */}
        <div className="h-1 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400" />

        {/* Body */}
        <div className="px-12 py-10">
          <div className="text-center mb-10">
            <p className="text-sm uppercase tracking-[0.3em] text-gray-500 mb-2">
              Certificate of Verification
            </p>
            <h1 className="text-4xl font-bold text-brand-950 mb-2">
              Academic Integrity Certificate
            </h1>
            <p className="text-gray-600">
              This certifies that the academic records listed below have been verified and authenticated.
            </p>
          </div>

          {/* Student details */}
          <div className="flex items-start justify-between gap-8">
            <div className="flex-1">
              <div className="border-l-4 border-yellow-400 pl-6 mb-8">
                <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">Student Name</p>
                <p className="text-3xl font-bold text-gray-900">{cert.studentName}</p>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-8">
                <Field label="Student ID" value={cert.studentId} mono />
                <Field label="Verification ID" value={cert.verificationId} mono small />
                <Field label="Date of Issue" value={issuedDate} />
                <Field
                  label="Status"
                  value={cert.fullyVerified ? "Fully Verified Academic Record" : "Partial"}
                />
              </div>

              {/* Verification checklist */}
              <div className="mb-8">
                <p className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                  Verified Documents
                </p>
                <div className="space-y-2">
                  <CheckRow label="Attendance Record" ok={cert.attendanceVerified} />
                  <CheckRow label="Academic Transcript" ok={cert.transcriptVerified} />
                  <CheckRow label="Examination Results" ok={cert.resultsVerified} />
                </div>
              </div>

              {/* Blockchain TX */}
              {cert.blockchainTxHash && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Blockchain Transaction Hash
                  </p>
                  <p className="font-mono text-xs text-gray-700 break-all">
                    {cert.blockchainTxHash}
                  </p>
                </div>
              )}
            </div>

            {/* QR code */}
            <div className="shrink-0 text-center">
              <div className="border-2 border-brand-200 rounded-xl p-3 bg-white shadow-sm">
                <img
                  src={qrDataUrl}
                  alt="QR code for verification"
                  className="w-40 h-40"
                />
              </div>
              <p className="text-xs text-gray-400 mt-2 max-w-[10rem]">
                Scan to verify online
              </p>
            </div>
          </div>
        </div>

        {/* Footer seal */}
        <div className="h-1 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400" />
        <div className="bg-brand-950 px-12 py-5 flex items-center justify-between text-xs" style={{ fontFamily: "Inter, sans-serif" }}>
          <div className="text-brand-300">
            <p>Verify online at: <span className="text-white font-mono">{verifyUrl}</span></p>
          </div>
          {cert.fullyVerified && (
            <div className="flex items-center gap-2 bg-green-500 px-4 py-1.5 rounded-full">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-white font-semibold">AUTHENTIC</span>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          #certificate { box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}

function Field({
  label, value, mono = false, small = false,
}: {
  label: string; value: string; mono?: boolean; small?: boolean;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-gray-400 mb-0.5">{label}</p>
      <p
        className={`font-semibold text-gray-800 break-all ${
          mono ? "font-mono" : ""
        } ${small ? "text-xs" : "text-sm"}`}
      >
        {value}
      </p>
    </div>
  );
}

function CheckRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
          ok ? "bg-green-500" : "bg-gray-200"
        }`}
      >
        {ok && (
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span className={`text-sm ${ok ? "text-gray-800" : "text-gray-400"}`}>{label}</span>
      <span className={`ml-auto text-xs font-medium ${ok ? "text-green-600" : "text-gray-400"}`}>
        {ok ? "VERIFIED" : "NOT VERIFIED"}
      </span>
    </div>
  );
}
