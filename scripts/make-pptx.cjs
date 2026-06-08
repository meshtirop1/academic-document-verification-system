const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.title  = "Academic Integrity Verification System";

const NAVY   = "1e1b4b";
const INDIGO = "6366f1";
const WHITE  = "FFFFFF";
const LIGHT  = "f8fafc";
const TEXT   = "1e293b";
const MUTED  = "64748b";
const BORDER = "e2e8f0";
const PH_BG  = "f1f5f9";
const PH_BD  = "94a3b8";
const CARD   = "f8f9ff";
const CARD_B = "e0e7ff";
const STAT   = "f0f0ff";
const STAT_B = "c7d2fe";

const mkShadow = () => ({ type: "outer", blur: 8, offset: 2, angle: 135, color: "000000", opacity: 0.08 });

function topBand(s, label) {
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.7, fill: { color: NAVY }, line: { color: NAVY, width: 0 } });
  s.addText(label, { x: 0.4, y: 0, w: 9.2, h: 0.7, fontSize: 10, color: "a5b4fc", fontFace: "Calibri", bold: true, charSpacing: 4, valign: "middle" });
}

function heading(s, txt, x, y, w, size) {
  s.addText(txt, { x, y, w, h: 0.65, fontSize: size || 27, color: NAVY, bold: true, fontFace: "Georgia" });
}

function placeholder(s, x, y, w, h, label) {
  s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: PH_BG }, line: { color: PH_BD, width: 1.5, dashType: "dash" } });
  s.addText(label, { x, y, w, h, fontSize: 11, color: MUTED, align: "center", valign: "middle", fontFace: "Calibri", italic: true, margin: 0 });
}

// ── Slide 1: Title ────────────────────────────────────────────────────────────
(function () {
  const s = pres.addSlide();
  s.background = { color: NAVY };

  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 1.85, w: 0.1, h: 2.0, fill: { color: INDIGO }, line: { color: INDIGO, width: 0 } });

  s.addText("UNIVERSITY PROJECT  ·  2024", {
    x: 0.5, y: 0.9, w: 9, h: 0.4, fontSize: 10, color: "a5b4fc", fontFace: "Calibri", charSpacing: 4, align: "center"
  });
  s.addText("Academic Integrity\nVerification System", {
    x: 0.5, y: 1.45, w: 9, h: 1.95, fontSize: 44, color: WHITE, bold: true, fontFace: "Georgia", align: "center", valign: "middle"
  });
  s.addText("Blockchain-Based Academic Record Verification", {
    x: 0.5, y: 3.5, w: 9, h: 0.5, fontSize: 16, color: "a5b4fc", fontFace: "Calibri", align: "center"
  });
  s.addShape(pres.shapes.RECTANGLE, { x: 3.8, y: 4.1, w: 2.4, h: 0.03, fill: { color: INDIGO }, line: { color: INDIGO, width: 0 } });
  s.addText("[Your Name]   ·   [University Name]   ·   2024", {
    x: 0.5, y: 5.0, w: 9, h: 0.3, fontSize: 10.5, color: "818cf8", fontFace: "Calibri", align: "center"
  });
})();

// ── Slide 2: The Problem ──────────────────────────────────────────────────────
(function () {
  const s = pres.addSlide();
  s.background = { color: WHITE };
  topBand(s, "THE PROBLEM");
  heading(s, "The Problem We Are Solving", 0.4, 0.85, 5.5);

  const items = [
    { n: "01", t: "Universities still rely on paper certificates that are easy to forge — no digital trail, no verification layer." },
    { n: "02", t: "Employers and institutions have no fast, reliable way to verify a candidate's academic records." },
    { n: "03", t: "Transcripts and results can be tampered with after printing, leaving no trace of manipulation." },
  ];
  items.forEach((p, i) => {
    const y = 1.65 + i * 1.12;
    s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y, w: 0.07, h: 0.88, fill: { color: INDIGO }, line: { color: INDIGO, width: 0 } });
    s.addText(p.n, { x: 0.58, y, w: 0.55, h: 0.88, fontSize: 20, color: INDIGO, bold: true, fontFace: "Georgia", valign: "middle" });
    s.addText(p.t, { x: 1.18, y: y + 0.06, w: 4.6, h: 0.76, fontSize: 12.5, color: TEXT, fontFace: "Calibri", valign: "middle" });
  });
  placeholder(s, 6.1, 0.85, 3.5, 4.3, "[Screenshot — Example of\npaper certificate / fraud case]");
})();

// ── Slide 3: Why This Matters ─────────────────────────────────────────────────
(function () {
  const s = pres.addSlide();
  s.background = { color: WHITE };
  topBand(s, "THE CONTEXT");
  heading(s, "Why Academic Fraud Is a Real Issue", 0.4, 0.85, 9.2);

  s.addText(
    "Certificate fraud costs institutions millions annually. A 2023 study found that 1 in 5 employers encountered a fake academic credential. Without a tamper-proof system, universities have no reliable way to protect the integrity of their graduates.",
    { x: 0.4, y: 1.6, w: 9.2, h: 1.0, fontSize: 13.5, color: MUTED, fontFace: "Calibri" }
  );

  const stats = [
    { big: "1 in 5", sub: "employers found a fake\nacademic credential" },
    { big: "Millions", sub: "lost annually by institutions\ndue to certificate fraud" },
    { big: "No standard", sub: "verification process exists\nacross universities today" },
  ];
  stats.forEach((st, i) => {
    const x = 0.4 + i * 3.1;
    s.addShape(pres.shapes.RECTANGLE, { x, y: 2.8, w: 2.9, h: 2.5, fill: { color: STAT }, line: { color: STAT_B, width: 1.5 }, shadow: mkShadow() });
    s.addShape(pres.shapes.RECTANGLE, { x, y: 2.8, w: 2.9, h: 0.07, fill: { color: INDIGO }, line: { color: INDIGO, width: 0 } });
    s.addText(st.big, { x: x + 0.1, y: 3.0, w: 2.7, h: 0.8, fontSize: 26, color: NAVY, bold: true, fontFace: "Georgia", align: "center" });
    s.addText(st.sub, { x: x + 0.1, y: 3.85, w: 2.7, h: 1.3, fontSize: 11.5, color: MUTED, fontFace: "Calibri", align: "center" });
  });
})();

// ── Slide 4: Our Solution ─────────────────────────────────────────────────────
(function () {
  const s = pres.addSlide();
  s.background = { color: WHITE };
  topBand(s, "OUR SOLUTION");
  heading(s, "Introducing AIVS", 0.4, 0.85, 5.5, 30);

  s.addText(
    "AIVS is a web-based system that uses blockchain technology to store and verify student academic records.\n\nEvery document uploaded is hashed using SHA-256 and permanently recorded on the Ethereum blockchain — making it impossible to tamper with.\n\nWhen all three records are verified, the system automatically issues a signed digital certificate anyone can check.",
    { x: 0.4, y: 1.65, w: 5.2, h: 3.6, fontSize: 13, color: TEXT, fontFace: "Calibri", valign: "top" }
  );
  placeholder(s, 5.9, 0.85, 3.7, 4.45, "[Screenshot —\nDashboard Overview]");
})();

// ── Slide 5: How It Works ─────────────────────────────────────────────────────
(function () {
  const s = pres.addSlide();
  s.background = { color: LIGHT };
  topBand(s, "THE PROCESS");
  s.addText("How The System Works", { x: 0.4, y: 0.85, w: 9.2, h: 0.6, fontSize: 28, color: NAVY, bold: true, fontFace: "Georgia", align: "center" });

  const steps = [
    { n: "1", title: "Professor\nUploads Document",  sub: "Any file type, up to 20 MB" },
    { n: "2", title: "SHA-256 Hash\nGenerated",       sub: "Server-side, never stored" },
    { n: "3", title: "Hash Stored\non Blockchain",    sub: "Ethereum, permanent record" },
    { n: "4", title: "Certificate\nIssued",           sub: "QR code + TX hash included" },
  ];

  steps.forEach((step, i) => {
    const x = 0.28 + i * 2.38;
    const y = 1.65;
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 2.1, h: 2.95, fill: { color: WHITE }, line: { color: BORDER, width: 1 }, shadow: mkShadow() });
    s.addShape(pres.shapes.OVAL, { x: x + 0.575, y: y + 0.22, w: 0.95, h: 0.95, fill: { color: INDIGO }, line: { color: INDIGO, width: 0 } });
    s.addText(step.n, { x: x + 0.575, y: y + 0.22, w: 0.95, h: 0.95, fontSize: 22, color: WHITE, bold: true, fontFace: "Georgia", align: "center", valign: "middle", margin: 0 });
    s.addText(step.title, { x: x + 0.1, y: y + 1.32, w: 1.9, h: 0.9, fontSize: 12, color: NAVY, bold: true, fontFace: "Calibri", align: "center" });
    s.addText(step.sub,   { x: x + 0.1, y: y + 2.28, w: 1.9, h: 0.45, fontSize: 9.5, color: MUTED, fontFace: "Calibri", align: "center", italic: true });
    if (i < 3) {
      s.addShape(pres.shapes.RECTANGLE, { x: x + 2.1, y: y + 1.53, w: 0.28, h: 0.04, fill: { color: INDIGO }, line: { color: INDIGO, width: 0 } });
    }
  });

  s.addText("All steps happen within seconds  —  the file itself is never stored, only its hash.", {
    x: 0.4, y: 4.9, w: 9.2, h: 0.35, fontSize: 10.5, color: MUTED, fontFace: "Calibri", italic: true, align: "center"
  });
})();

// ── Slide 6: Key Features ─────────────────────────────────────────────────────
(function () {
  const s = pres.addSlide();
  s.background = { color: WHITE };
  topBand(s, "FEATURES");
  heading(s, "Key Features", 0.4, 0.85, 9.2);

  const features = [
    { t: "Role-Based Access",  d: "Separate dashboards for Admin, Professor and Student with protected routes" },
    { t: "Blockchain Hashing", d: "Every document gets a SHA-256 hash permanently stored on the Ethereum chain" },
    { t: "Auto Certificate",   d: "Certificate auto-issued the moment all 3 document types are uploaded" },
    { t: "QR Verification",    d: "Anyone can scan the QR code on the certificate to verify it instantly" },
    { t: "Tamper Detection",   d: "Any change to a document causes a hash mismatch and verification fails" },
    { t: "Public Verifier",    d: "Search by Student ID or Verification ID — no login required" },
  ];

  features.forEach((f, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.35 + col * 3.15;
    const y = 1.6  + row * 1.88;
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 2.95, h: 1.68, fill: { color: CARD }, line: { color: CARD_B, width: 1 }, shadow: mkShadow() });
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.07, h: 1.68, fill: { color: INDIGO }, line: { color: INDIGO, width: 0 } });
    s.addText(f.t, { x: x + 0.2, y: y + 0.15, w: 2.6, h: 0.42, fontSize: 13, color: NAVY, bold: true, fontFace: "Calibri" });
    s.addText(f.d, { x: x + 0.2, y: y + 0.6,  w: 2.6, h: 1.0,  fontSize: 10.5, color: MUTED, fontFace: "Calibri" });
  });
})();

// ── Slide 7: Screenshots 1 ────────────────────────────────────────────────────
(function () {
  const s = pres.addSlide();
  s.background = { color: WHITE };
  topBand(s, "WALKTHROUGH");
  heading(s, "System Walkthrough", 0.4, 0.85, 9.2);

  placeholder(s, 0.35, 1.6,  4.55, 3.45, "[Screenshot — Login Page]");
  placeholder(s, 5.1,  1.6,  4.55, 3.45, "[Screenshot — Admin Dashboard]");

  s.addText("Login Page",       { x: 0.35, y: 5.1, w: 4.55, h: 0.28, fontSize: 10, color: MUTED, fontFace: "Calibri", align: "center", italic: true });
  s.addText("Admin Dashboard",  { x: 5.1,  y: 5.1, w: 4.55, h: 0.28, fontSize: 10, color: MUTED, fontFace: "Calibri", align: "center", italic: true });
})();

// ── Slide 8: Screenshots 2 ────────────────────────────────────────────────────
(function () {
  const s = pres.addSlide();
  s.background = { color: WHITE };
  topBand(s, "WALKTHROUGH");
  heading(s, "Professor & Student Views", 0.4, 0.85, 9.2);

  placeholder(s, 0.35, 1.6, 4.55, 3.45, "[Screenshot — Upload Document Page]");
  placeholder(s, 5.1,  1.6, 4.55, 3.45, "[Screenshot — Student Dashboard]");

  s.addText("Upload Document Page", { x: 0.35, y: 5.1, w: 4.55, h: 0.28, fontSize: 10, color: MUTED, fontFace: "Calibri", align: "center", italic: true });
  s.addText("Student Dashboard",    { x: 5.1,  y: 5.1, w: 4.55, h: 0.28, fontSize: 10, color: MUTED, fontFace: "Calibri", align: "center", italic: true });
})();

// ── Slide 9: The Certificate ──────────────────────────────────────────────────
(function () {
  const s = pres.addSlide();
  s.background = { color: WHITE };
  topBand(s, "THE OUTPUT");
  s.addText("Verification Certificate", { x: 0.4, y: 0.85, w: 9.2, h: 0.6, fontSize: 28, color: NAVY, bold: true, fontFace: "Georgia", align: "center" });

  placeholder(s, 1.6, 1.6, 6.8, 3.15, "[Screenshot — Generated Certificate with QR Code]");

  s.addText("The certificate contains: Student Name  ·  Student ID  ·  Verification ID  ·  Issue Date  ·  QR Code  ·  Blockchain Transaction Hash", {
    x: 0.4, y: 4.88, w: 9.2, h: 0.45, fontSize: 11, color: MUTED, fontFace: "Calibri", align: "center", italic: true
  });
})();

// ── Slide 10: Conclusion ──────────────────────────────────────────────────────
(function () {
  const s = pres.addSlide();
  s.background = { color: NAVY };

  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 1.3, w: 0.1, h: 2.8, fill: { color: INDIGO }, line: { color: INDIGO, width: 0 } });

  s.addText("CONCLUSION", { x: 0.4, y: 0.45, w: 9.2, h: 0.42, fontSize: 10, color: "818cf8", fontFace: "Calibri", bold: true, charSpacing: 4 });
  s.addText("What We Built", { x: 0.4, y: 0.95, w: 9.2, h: 0.7, fontSize: 34, color: WHITE, bold: true, fontFace: "Georgia" });

  const lines = [
    "AIVS solves a real problem that universities face today — academic record fraud.",
    "Using Remix, Solidity, Ethers.js, and SQLite, we built a full-stack system that makes academic records verifiable by anyone, anywhere.",
    "The blockchain guarantees that once a record is stored, it cannot be changed.",
  ];
  lines.forEach((line, i) => {
    const y = 1.85 + i * 0.72;
    s.addShape(pres.shapes.OVAL, { x: 0.42, y: y + 0.1, w: 0.28, h: 0.28, fill: { color: INDIGO }, line: { color: INDIGO, width: 0 } });
    s.addText(line, { x: 0.88, y, w: 8.75, h: 0.6, fontSize: 12.5, color: "e0e7ff", fontFace: "Calibri", valign: "middle" });
  });

  s.addText("Thank You", { x: 0.4, y: 4.2, w: 9.2, h: 0.85, fontSize: 40, color: WHITE, bold: true, fontFace: "Georgia", align: "center" });
  s.addText("Questions are welcome", { x: 0.4, y: 5.1, w: 9.2, h: 0.3, fontSize: 11.5, color: "818cf8", fontFace: "Calibri", align: "center", italic: true });
})();

// ── Save ──────────────────────────────────────────────────────────────────────
pres.writeFile({ fileName: "C:\\Users\\mtiro\\blchain project\\AIVS-Presentation.pptx" })
  .then(() => console.log("Saved: AIVS-Presentation.pptx"))
  .catch(err => console.error(err));
