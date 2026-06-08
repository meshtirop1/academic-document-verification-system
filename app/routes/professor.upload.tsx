import {
  json,
  unstable_createMemoryUploadHandler,
  unstable_parseMultipartFormData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation, useSearchParams } from "@remix-run/react";
import { createHash } from "node:crypto";
import { v4 as uuidv4 } from "uuid";
import { requireProfessor } from "~/utils/auth.server";
import { db } from "~/utils/db.server";
import {
  storeDocumentHash,
  recordVerificationOnChain,
  isBlockchainAvailable,
} from "~/utils/blockchain.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const professor = await requireProfessor(request);
  const students = await db.user.findMany({
    where: { role: "STUDENT", studentId: { not: null } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, studentId: true },
  });
  const bcAvailable = await isBlockchainAvailable();
  return json({ students, professorId: professor.id, bcAvailable });
}

export async function action({ request }: ActionFunctionArgs) {
  const professor = await requireProfessor(request);

  const uploadHandler = unstable_createMemoryUploadHandler({ maxPartSize: 20 * 1024 * 1024 });
  const formData = await unstable_parseMultipartFormData(request, uploadHandler);

  const studentId = String(formData.get("studentId") ?? "").trim();
  const docType   = String(formData.get("docType")   ?? "").trim().toUpperCase();
  const file      = formData.get("file") as File | null;

  if (!studentId || !docType || !file || file.size === 0) {
    return json({ error: "Student, document type, and file are all required." }, { status: 400 });
  }

  if (!["ATTENDANCE", "TRANSCRIPT", "RESULTS"].includes(docType)) {
    return json({ error: "Invalid document type." }, { status: 400 });
  }

  // Generate SHA-256 hash
  const buffer   = Buffer.from(await file.arrayBuffer());
  const fileHash = createHash("sha256").update(buffer).digest("hex");

  let txHash: string | null = null;
  let bcError: string | null = null;

  try {
    txHash = await storeDocumentHash(studentId, docType, fileHash);
  } catch (err) {
    bcError = err instanceof Error ? err.message : "Blockchain unavailable — hash saved to DB only.";
  }

  // Upsert document record
  await db.document.upsert({
    where:  { studentId_docType: { studentId, docType: docType as any } },
    create: {
      studentId,
      docType:          docType as any,
      fileHash,
      originalFilename: file.name,
      txHash:           txHash ?? undefined,
      uploadedById:     professor.id,
    },
    update: {
      fileHash,
      originalFilename: file.name,
      txHash:           txHash ?? undefined,
      uploadedById:     professor.id,
      uploadedAt:       new Date(),
    },
  });

  // Check if all 3 document types exist for this student
  const docs = await db.document.findMany({ where: { studentId } });
  const hasAll =
    docs.some((d) => d.docType === "ATTENDANCE") &&
    docs.some((d) => d.docType === "TRANSCRIPT") &&
    docs.some((d) => d.docType === "RESULTS");

  let certCreated = false;
  if (hasAll) {
    const student = await db.user.findFirst({
      where: { studentId, role: "STUDENT" },
      select: { name: true },
    });

    const existing = await db.verificationCertificate.findUnique({
      where: { studentId },
    });

    if (!existing) {
      const verificationId = uuidv4().toUpperCase();
      let certTxHash: string | null = null;

      try {
        certTxHash = await recordVerificationOnChain(studentId, verificationId);
      } catch {
        // Blockchain recording failed — still create the DB record
      }

      await db.verificationCertificate.create({
        data: {
          verificationId,
          studentId,
          studentName:       student?.name ?? "Unknown",
          attendanceVerified: true,
          transcriptVerified: true,
          resultsVerified:    true,
          fullyVerified:      true,
          blockchainTxHash:  certTxHash ?? undefined,
        },
      });
      certCreated = true;
    }
  }

  return json({
    success: true,
    fileHash,
    txHash,
    bcError,
    certCreated,
    docType,
    studentId,
  });
}

export default function ProfessorUpload() {
  const { students, bcAvailable } = useLoaderData<typeof loader>();
  const actionData  = useActionData<typeof action>();
  const navigation  = useNavigation();
  const [params]    = useSearchParams();
  const submitting  = navigation.state === "submitting";

  return (
    <div className="p-8 max-w-2xl">
      <div className="page-header">
        <h1 className="page-title">Upload Academic Document</h1>
        <p className="page-subtitle">Documents are hashed and stored on the blockchain</p>
      </div>

      {!bcAvailable && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          <strong>Blockchain node offline.</strong> Hashes will be saved to the database only. Start
          the local Hardhat node with <code className="font-mono">npm run chain</code>.
        </div>
      )}

      {actionData && "error" in actionData && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {actionData.error}
        </div>
      )}

      {actionData && "success" in actionData && (
        <div className="mb-6 space-y-3">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="font-semibold text-green-800 mb-2">
              {actionData.docType} uploaded for {actionData.studentId}
            </p>
            <dl className="text-xs space-y-1">
              <div className="flex gap-2">
                <dt className="text-green-600 font-medium w-20 shrink-0">SHA-256</dt>
                <dd className="font-mono text-green-800 break-all">{actionData.fileHash}</dd>
              </div>
              {actionData.txHash && (
                <div className="flex gap-2">
                  <dt className="text-green-600 font-medium w-20 shrink-0">TX Hash</dt>
                  <dd className="font-mono text-green-800 break-all">{actionData.txHash}</dd>
                </div>
              )}
              {actionData.bcError && (
                <p className="text-yellow-700 mt-1">{actionData.bcError}</p>
              )}
            </dl>
          </div>
          {actionData.certCreated && (
            <div className="p-4 bg-brand-50 border border-brand-200 rounded-lg">
              <p className="font-semibold text-brand-800">
                All 3 documents verified — Certificate issued!
              </p>
              <p className="text-sm text-brand-600 mt-1">
                The student can now download their Academic Integrity Verification Certificate.
              </p>
            </div>
          )}
        </div>
      )}

      <Form method="post" encType="multipart/form-data" className="card p-6 space-y-5">
        <div>
          <label className="label">Student</label>
          <select
            name="studentId"
            required
            className="input"
            defaultValue={params.get("studentId") ?? ""}
          >
            <option value="">Select a student…</option>
            {students.map((s) => (
              <option key={s.id} value={s.studentId!}>
                {s.name} ({s.studentId})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Document Type</label>
          <select name="docType" required className="input">
            <option value="">Select type…</option>
            <option value="ATTENDANCE">Attendance Record</option>
            <option value="TRANSCRIPT">Transcript</option>
            <option value="RESULTS">Exam Results</option>
          </select>
        </div>

        <div>
          <label className="label">File</label>
          <div className="mt-1 flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer relative">
            <input
              name="file"
              type="file"
              required
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.png"
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <div className="text-center">
              <svg className="mx-auto w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <p className="text-sm text-gray-500">Click to upload or drag &amp; drop</p>
              <p className="text-xs text-gray-400 mt-0.5">PDF, Word, Excel, or image — max 20 MB</p>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <button type="submit" disabled={submitting} className="btn-primary w-full justify-center py-3">
            {submitting ? "Processing…" : "Upload & Verify on Blockchain"}
          </button>
        </div>
      </Form>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-500">
        <p className="font-medium text-gray-700 mb-1">How it works</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>File is received and a SHA-256 hash is generated server-side.</li>
          <li>Hash is stored on the local Ethereum blockchain via the smart contract.</li>
          <li>File metadata is saved to PostgreSQL.</li>
          <li>When all 3 document types are uploaded, a final certificate is automatically issued.</li>
        </ol>
      </div>
    </div>
  );
}
