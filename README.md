# Academic Integrity Verification System (AIVS)

A blockchain-based web application that verifies student academic records (attendance, transcripts, exam results) and issues tamper-proof, publicly-verifiable certificates.

The core idea: every uploaded document is reduced to a SHA-256 fingerprint, that fingerprint is written to an immutable Ethereum smart contract, and a mirror copy is kept in a relational database for fast lookups. Anyone — student, employer, or auditor — can re-hash a document and ask the blockchain "does this match what was originally submitted?" If even a single byte changed, the answer is *no*, and there is a permanent on-chain record of who uploaded the original and when.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Setup Instructions](#setup-instructions)
- [Environment Variables Reference](#environment-variables-reference)
- [Demo Accounts](#demo-accounts)
- [How to Test the Full Flow (Manual Walkthrough)](#how-to-test-the-full-flow-manual-walkthrough)
- [Smart Contract](#smart-contract)
- [Pages / Routes](#pages--routes)
- [Authentication & Authorization Model](#authentication--authorization-model)
- [Tamper Detection — How It Actually Works](#tamper-detection--how-it-actually-works)
- [Database Schema](#database-schema)
- [Automated Test Suite](#automated-test-suite)
- [Troubleshooting](#troubleshooting)
- [Production Notes](#production-notes)

---

## Tech Stack

| Layer            | Technology                                              |
|------------------|---------------------------------------------------------|
| Frontend         | Remix v2 (Vite-based), React 18, Tailwind CSS           |
| Backend          | Remix server (Node.js, loaders & actions)               |
| Blockchain       | Solidity 0.8.19 smart contract, Ethers.js v6            |
| Local chain      | Hardhat (Ethereum development node, chain ID 31337)     |
| Database         | SQLite + Prisma ORM                                     |
| Auth             | Cookie-based sessions (`createCookieSessionStorage`) + bcryptjs password hashing |
| Hashing          | SHA-256 (Node `crypto`), stored both on-chain and in DB |
| QR Codes         | `qrcode` npm package (rendered on certificates)         |
| PDF / export     | `jspdf`, `html2canvas`                                  |
| Testing          | Vitest 4 (unit/route/component), Hardhat + Chai (contract), Testing Library + happy-dom (React components) |

> **Note on the database:** earlier drafts of this README (and some comments elsewhere) referred to PostgreSQL. The project actually ships with **SQLite** — see [`prisma/schema.prisma`](./prisma/schema.prisma), which declares `provider = "sqlite"` and a local file datasource (`dev.db`). No external database server is required; Prisma manages a single file on disk. This is intentional for local development and demos — see [Production Notes](#production-notes) for guidance on swapping to a server-based database for production.

## Architecture

```
                         ┌─────────────────────────┐
                         │   Professor uploads a   │
                         │   document (PDF/image)  │
                         └────────────┬────────────┘
                                      │
                                      ▼
                       Server reads the file buffer and
                       computes a SHA-256 fingerprint
                                      │
                ┌─────────────────────┼─────────────────────┐
                ▼                                           ▼
   Write the hash to the Ethereum            Upsert a Document row in the
   smart contract via storeHash()            database (studentId + docType
   → returns a transaction hash              are unique together)
                │                                           │
                └─────────────────────┬─────────────────────┘
                                      ▼
                     Has this student now submitted ALL
                     THREE document types (attendance,
                     transcript, exam results)?
                                      │
                                     YES
                                      │
                                      ▼
                ┌──────────────────────────────────────────┐
                │     Auto-issue a Verification Certificate │
                │  • Generate a unique verificationId (UUID)│
                │  • recordVerification() on-chain          │
                │  • Save VerificationCertificate row in DB │
                │  • Render certificate page + QR code      │
                └──────────────────────────────────────────┘
```

**Why both a blockchain *and* a database?**
The blockchain is the *source of truth* for integrity — it's append-only, tamper-evident, and independently auditable by anyone with the contract address (no trust in the university's database required). The relational database is a *performance and convenience layer* — it lets the app render dashboards, search by student ID, and join document metadata without making an RPC call for every page render. If the two ever disagree, the blockchain wins: `verifyDocumentHash()` always re-checks against the chain.

## Project Structure

```
blchain project/
├── app/
│   ├── components/            # Reusable React UI (Sidebar, StatsCard, …)
│   ├── routes/                # Remix file-based routes (loaders + actions + UI)
│   │   ├── _index.tsx             # Public landing page
│   │   ├── login.tsx              # Login form + session creation
│   │   ├── admin._index.tsx       # Admin dashboard
│   │   ├── admin.users.tsx        # Admin: create/delete users
│   │   ├── professor.tsx          # Professor layout/shell
│   │   ├── professor._index.tsx   # Professor dashboard (per-student status)
│   │   ├── professor.upload.tsx   # Document upload action (hash + chain + DB)
│   │   ├── student._index.tsx     # Student dashboard / certificate view
│   │   ├── verify._index.tsx      # Public search by student/verification ID
│   │   └── verify.$id.tsx         # Public printable certificate + QR
│   ├── utils/
│   │   ├── auth.server.ts         # getUser / requireUser / requireRole guards
│   │   ├── session.server.ts      # Cookie session storage primitives
│   │   ├── blockchain.server.ts   # ethers.js contract bindings
│   │   └── db.server.ts           # Prisma client singleton
│   ├── root.tsx               # App shell, layout, global styles
│   ├── entry.client.tsx       # Client hydration entry
│   └── entry.server.tsx       # Server render entry
├── contracts/
│   └── AcademicVerification.sol   # The on-chain source of truth
├── scripts/
│   ├── deploy.cjs             # Deploys the contract to the local Hardhat node
│   └── seed.cjs               # Seeds demo users into the database
├── prisma/
│   ├── schema.prisma          # Data model (SQLite datasource)
│   └── dev.db                 # The actual SQLite database file (generated)
├── test/                      # Full automated test suite (see below)
│   ├── setup.ts
│   ├── helpers.ts
│   ├── AcademicVerification.test.cjs   # Hardhat/Chai contract tests
│   ├── utils/                 # Unit tests for server utilities
│   ├── routes/                # Route loader/action tests
│   └── components/            # React component tests
├── hardhat.config.cjs         # Hardhat network + compiler configuration
├── vitest.config.ts           # Vitest runner + coverage configuration
├── vite.config.ts             # Vite/Remix build configuration
├── tsconfig.json              # TS config (path alias: ~/* → ./app/*)
├── .env.example               # Template for local environment variables
└── package.json
```

## Prerequisites

- **Node.js 20+** and npm
- **Git**
- No external database server is needed — SQLite is file-based and ships with Prisma.
- Two free terminal windows (one for the local blockchain node, one for the dev server).

## Setup Instructions

### 1. Clone and install dependencies

```bash
cd "blchain project"
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and, at minimum, set a real `SESSION_SECRET`:

```env
SESSION_SECRET="change-this-to-a-long-random-string"
```

The other values (`DATABASE_URL`, `BLOCKCHAIN_RPC_URL`, `CONTRACT_ADDRESS`, `DEPLOYER_PRIVATE_KEY`, `APP_URL`) already have working local-dev defaults in `.env.example` — see the [Environment Variables Reference](#environment-variables-reference) below for what each one does and when you'd need to change it.

### 3. Set up the database

The database is a local SQLite file — there is **no server to install or `CREATE DATABASE` step**. Prisma creates the file for you:

```bash
npx prisma db push
npx prisma generate
```

This creates `prisma/dev.db` (if it doesn't already exist) and generates the type-safe Prisma Client used throughout `app/utils/db.server.ts`.

Seed demo users (admin, professor, students):

```bash
npm run seed
```

> Want to inspect the data visually? Run `npx prisma studio` to open a browser-based database GUI.

### 4. Compile the Solidity smart contract

```bash
npx hardhat compile --config hardhat.config.cjs
```

This produces ABI/bytecode artifacts under `artifacts/` that both the deploy script and `app/utils/blockchain.server.ts` rely on.

### 5. Start the local Ethereum blockchain

Open a **new terminal** and run:

```bash
npm run chain
# Keeps running — leave this terminal open
```

This starts a Hardhat node at `http://127.0.0.1:8545` (chain ID `31337`) with 20 pre-funded test accounts and prints their addresses + private keys. **Every time you restart this node, its in-memory state — including any deployed contracts — is wiped.** You must redeploy (next step) after every restart; see [Troubleshooting](#troubleshooting) for the symptoms if you forget.

### 6. Deploy the smart contract

In another terminal (with the chain still running):

```bash
npm run deploy:contract
```

The script deploys `AcademicVerification.sol` using the account derived from `DEPLOYER_PRIVATE_KEY` and prints the deployed `CONTRACT_ADDRESS`.

> **Good to know:** because Ethereum contract addresses are deterministically derived from the deployer's address and account nonce, redeploying from a freshly-restarted node with the *same* deployer key and the *same* nonce (i.e. the very first transaction from that account) reproduces the **exact same contract address** every time. That's why `.env.example` already ships with a `CONTRACT_ADDRESS` that matches what `npm run deploy:contract` will print on a clean Hardhat node — in the common case you don't need to copy/paste anything. If you ever see a *different* address printed (e.g. because the deployer account already has prior transactions on that node), update `.env` accordingly.

```env
CONTRACT_ADDRESS="0x5FbDB2315678afecb367f032d93F642f64180aa3"
DEPLOYER_PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
```

> The default `DEPLOYER_PRIVATE_KEY` is Hardhat's well-known account #0 — funded only on local dev nodes, and **public knowledge**. Never use it (or any key printed by `npx hardhat node`) on a real network.

### 7. Start the development server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Quick reference — everyday commands

| Command                  | What it does                                             |
|--------------------------|----------------------------------------------------------|
| `npm run dev`            | Start the Remix dev server (with HMR)                    |
| `npm run chain`          | Start the local Hardhat blockchain node                  |
| `npm run deploy:contract`| Compile & deploy `AcademicVerification.sol` to the chain |
| `npm run seed`           | Seed demo users into the database                        |
| `npm run prisma:studio`  | Open a GUI to browse/edit the database                   |
| `npm run build`          | Production build                                          |
| `npm run start`          | Run the production build                                  |
| `npm run typecheck`      | Run TypeScript's compiler in `--noEmit` mode              |
| `npm test`               | Run the Vitest unit/route/component suite                |
| `npm run test:contract`  | Run the Hardhat/Chai smart-contract suite                 |
| `npm run test:all`       | Run **both** suites (contract first, then app-level)     |
| `npm run test:coverage`  | Run the Vitest suite with a coverage report               |

## Environment Variables Reference

All variables live in `.env` (copy from `.env.example`, never commit the real file).

| Variable               | Purpose                                                                                          | Local-dev default                                                  |
|------------------------|--------------------------------------------------------------------------------------------------|---------------------------------------------------------------------|
| `DATABASE_URL`         | Connection string Prisma reads at the CLI/tooling level. The actual datasource used by the running app is hardcoded in `prisma/schema.prisma` as a local SQLite file — this var mainly matters if you change the schema to read from `env("DATABASE_URL")`. | `postgresql://postgres:password@localhost:5432/aivs_db` *(legacy placeholder — the schema currently points at the SQLite file directly; see note below)* |
| `SESSION_SECRET`       | Symmetric key used to sign/encrypt the cookie session (via `createCookieSessionStorage`). **Must** be changed for any non-local deployment. | a placeholder string — change it                                   |
| `BLOCKCHAIN_RPC_URL`   | JSON-RPC endpoint the server connects to for all on-chain reads/writes (`ethers.JsonRpcProvider`). | `http://127.0.0.1:8545` (the local Hardhat node)                   |
| `CONTRACT_ADDRESS`     | Address of the deployed `AcademicVerification` contract that `app/utils/blockchain.server.ts` binds to. | `0x5FbDB2315678afecb367f032d93F642f64180aa3` (deterministic local address — see step 6) |
| `DEPLOYER_PRIVATE_KEY` | Private key of the wallet used to sign on-chain transactions (`storeHash`, `recordVerification`, …). | Hardhat account #0's well-known dev key — **local only**           |
| `APP_URL`              | Base URL embedded in generated QR codes so they resolve to the right host when scanned.          | `http://localhost:5173`                                            |

> **About the `DATABASE_URL` / SQLite discrepancy:** `prisma/schema.prisma` currently declares its datasource as `provider = "sqlite"` with a literal file path, rather than `env("DATABASE_URL")`. That means the `DATABASE_URL` value in `.env` is effectively unused by the running application today (it's a holdover from an earlier PostgreSQL-based design). The actual data lives in `prisma/dev.db`. If you intend to point this project at PostgreSQL/MySQL/etc. for production, you'll need to (a) change the `provider` and `url` in `schema.prisma` to read from `env("DATABASE_URL")`, (b) run a fresh `npx prisma db push` / migration against the new database, and (c) update `DATABASE_URL` to a real connection string. See [Production Notes](#production-notes).

## Demo Accounts

Seeded by `npm run seed`:

| Role      | Email                        | Password      | Notes                              |
|-----------|------------------------------|---------------|-------------------------------------|
| Admin     | admin@university.edu         | admin123      | User management                     |
| Professor | prof.smith@university.edu    | professor123  | Uploads documents, issues records   |
| Student   | alice@university.edu         | student123    | Student ID `STU-2024-001`           |
| Student   | bob@university.edu           | student123    | Student ID `STU-2024-002`           |
| Student   | carol@university.edu         | student123    | Student ID `STU-2024-003`           |

Passwords are hashed with `bcryptjs` before being stored — `scripts/seed.cjs` performs the hashing at seed time, and `app/utils/auth.server.ts` verifies with `bcrypt.compare` at login time. Plaintext passwords are never persisted.

## How to Test the Full Flow (Manual Walkthrough)

1. **Sign in as Professor** (`prof.smith@university.edu` / `professor123`) → go to **Upload**, choose Alice (`STU-2024-001`), and upload an *Attendance* file.
2. **Upload a Transcript** for Alice the same way.
3. **Upload Exam Results** for Alice → because all three document types are now present, a **Verification Certificate is issued automatically** (on-chain `recordVerification` + DB row + certificate page).
4. **Sign out**, then **sign in as Alice** (`alice@university.edu` / `student123`) → see her certificate and download/export it as a PDF.
5. **Visit `/verify`** (no login required) → search `STU-2024-001` → see the public verification result, including which documents are confirmed and the on-chain transaction references.
6. **Scan the QR code** printed on the certificate (or open `/verify/:id` directly) → opens the same public verification page — this is what an external party (e.g. an employer) would do to confirm a certificate is genuine.
7. **Try tampering**: re-upload a *modified* version of one of Alice's documents as the professor, then revisit `/verify` — notice the hash on record changes and any party holding the *old* file would now fail verification. See [Tamper Detection](#tamper-detection--how-it-actually-works) for exactly what happens under the hood.

## Smart Contract

Located at [`contracts/AcademicVerification.sol`](./contracts/AcademicVerification.sol). Compiled with Solidity `0.8.19` (see `hardhat.config.cjs` for compiler settings).

### Storage model

The contract keeps two mappings:

- `studentId → docType → { fileHash, timestamp, uploadedBy }` — one record per (student, document type) pair. Re-storing a hash for the same pair **overwrites** the previous record (the old value is gone from "current" storage, but the original `DocumentStored` event remains in the chain's event log forever).
- `verificationId → studentId` — a one-way lookup used to resolve a certificate's public ID back to the student it belongs to, with a uniqueness guard so a `verificationId` can never be claimed by two different students.

### Key functions

| Function | Mutates state? | Description |
|----------|:---:|-------------|
| `storeHash(studentId, docType, fileHash)` | ✅ | Stores a SHA-256 document hash with a block timestamp and the caller's address. Emits `DocumentStored(studentId, docType, fileHash, timestamp, uploadedBy)`. Reverts if any argument is empty. |
| `verifyHash(studentId, docType, fileHash)` | ❌ (view) | Returns `true` only if the supplied hash exactly matches the **currently stored** hash for that student/docType. Returns `false` for unknown students, mismatched types, stale hashes, or tampered files. |
| `getHash(studentId, docType)` | ❌ (view) | Returns the raw stored tuple `(fileHash, timestamp, uploadedBy)`. Returns zero-values (`""`, `0`, the zero address) when nothing is stored. |
| `recordVerification(studentId, verificationId)` | ✅ | Permanently links a certificate ID to a student. Emits `VerificationIssued(studentId, verificationId, timestamp)`. Reverts if the `verificationId` is already bound to a *different* student, or if either argument is empty. |
| `lookupVerification(verificationId)` | ❌ (view) | Resolves a `verificationId` back to its `studentId`, or `""` if unknown — this is what powers the public `/verify/:id` page. |
| `checkDocumentExists(studentId, docType)` | ❌ (view) | Lightweight existence check, used by the upload flow to decide whether all three required document types are now present (and a certificate should be auto-issued). |

### Events

- `DocumentStored(string studentId, string docType, string fileHash, uint256 timestamp, address uploadedBy)`
- `VerificationIssued(string studentId, string verificationId, uint256 timestamp)`

These events form the contract's permanent audit trail — even though "current" storage can be overwritten, every historical `storeHash` call is independently retrievable from chain history by anyone running a node or using a block explorer.

## Pages / Routes

| URL | Auth required | Description |
|-----|---------------|-------------|
| `/` | — | Public landing page |
| `/login` | — | Login form for all roles; creates the cookie session |
| `/admin` | Admin | Dashboard — counts of users, documents, certificates |
| `/admin/users` | Admin | Create and delete user accounts |
| `/professor` | Professor | Dashboard listing every student and their per-document verification status |
| `/professor/upload` | Professor | Upload a document for a specific student (computes hash, writes to chain + DB, may auto-issue a certificate) |
| `/student` | Student | The signed-in student's own status + certificate (if fully verified) |
| `/verify` | — | Public search by student ID or verification ID |
| `/verify/:id` | — | Full printable certificate with embedded QR code, suitable for sharing/printing |

## Authentication & Authorization Model

- **Sessions** are stateless signed cookies created via Remix's `createCookieSessionStorage` (see `app/utils/session.server.ts`). The cookie stores the user's ID and role; `SESSION_SECRET` signs it so it can't be forged or tampered with client-side.
- **Password storage**: `bcryptjs` hashes (with salt) — see `scripts/seed.cjs` for seeding and `app/utils/auth.server.ts` for verification at login.
- **Route guards** live in `app/utils/auth.server.ts`:
  - `getUser(request)` — returns the current user or `null`
  - `requireUser(request)` — redirects to `/login` if not authenticated
  - `requireAdmin(request)` / `requireProfessor(request)` / `requireStudent(request)` — redirect (or throw a 403) if the authenticated user doesn't hold the required role
- These guards are called at the top of every protected route's `loader`/`action`, so unauthorized access is rejected **before** any data is fetched or rendered — there is no client-side-only gating to bypass.

## Tamper Detection — How It Actually Works

This is the heart of the system, so here's the precise mechanics:

1. When a professor uploads a file, the server reads the raw bytes and computes `SHA-256(fileBytes)` — a 64-character hexadecimal fingerprint that changes completely if even one bit of the file changes (the "avalanche effect").
2. That fingerprint is sent to the smart contract's `storeHash(studentId, docType, fileHash)`. The transaction is mined, and the hash — together with a block timestamp and the uploader's wallet address — becomes part of the blockchain's permanent, append-only history. A `DocumentStored` event is emitted for anyone monitoring the chain.
3. A mirror copy (hash + metadata + the resulting transaction hash) is also upserted into the `documents` table for fast querying.
4. **If someone later modifies the document and re-uploads it:**
   - The server computes a *new*, completely different SHA-256 hash.
   - `storeHash` is called again — this **overwrites** the "current" record for that student/docType (both on-chain and in the DB), and emits a fresh `DocumentStored` event. The *original* event is not deleted — it remains permanently visible in the chain's historical log, creating an audit trail of every version that ever existed.
   - Anyone holding a copy of the *original* file and attempting `verifyHash(studentId, docType, originalHash)` now gets `false`, because it no longer matches what's currently on record.
   - Anyone holding the *new* (modified) file gets `true` for the new hash — which is exactly what you'd want: the system always reflects "what was most recently and officially submitted," while still being able to prove (via event history) that an earlier, different version once existed.
5. The public `/verify` and `/verify/:id` pages call `verifyDocumentHash()` (which itself calls the contract's `verifyHash`) so that **the blockchain — not the database — is the final arbiter** of whether a document is authentic. Even if the application's database were compromised or rolled back, the on-chain record would still tell the truth.

## Database Schema

SQLite via Prisma (`prisma/schema.prisma`, mapped to snake_case table/column names). Three models:

```
users (User)
├─ id            UUID, primary key
├─ email         unique
├─ password      bcrypt hash
├─ name
├─ role          "ADMIN" | "PROFESSOR" | "STUDENT"
├─ studentId     unique, nullable (only set for STUDENT accounts, e.g. "STU-2024-001")
└─ createdAt

documents (Document)
├─ id                 UUID, primary key
├─ studentId          e.g. "STU-2024-001"
├─ docType            "attendance" | "transcript" | "results"
├─ fileHash           SHA-256 hex digest
├─ originalFilename
├─ txHash             the on-chain transaction hash from storeHash()
├─ uploadedById       → users.id  (FK, "uploaded by" relation)
├─ uploadedAt
└─ @@unique([studentId, docType])   ← one current record per student/doc-type pair

verification_certificates (VerificationCertificate)
├─ id                  UUID, primary key
├─ verificationId      unique — the public-facing certificate ID (also recorded on-chain)
├─ studentId           unique — one certificate per student
├─ studentName
├─ attendanceVerified  boolean
├─ transcriptVerified  boolean
├─ resultsVerified     boolean
├─ fullyVerified       boolean — true once all three are confirmed
├─ blockchainTxHash    the on-chain transaction hash from recordVerification()
└─ issuedAt
```

The `@@unique([studentId, docType])` constraint on `documents` is what makes "uploading again" an *upsert* (update-or-insert) rather than creating duplicate rows — mirroring the smart contract's own overwrite-on-restore behavior, so the chain and the database stay in sync.

## Automated Test Suite

The project ships with a comprehensive, multi-layered automated test suite — **125 tests in total**, all passing — split across three runners that each target a different part of the stack:

| Layer | Runner | Where | What it covers |
|-------|--------|-------|----------------|
| **Smart contract** | Hardhat + Chai + `@nomicfoundation/hardhat-chai-matchers` | `test/AcademicVerification.test.cjs` (26 tests) | Every contract function (`storeHash`, `verifyHash`, `getHash`, `recordVerification`, `lookupVerification`, `checkDocumentExists`), all `require()` revert paths, event emission with exact argument matching (using `anyValue` from `hardhat-chai-matchers/withArgs` for timestamp wildcards), hash-overwrite semantics, multi-student/multi-doctype isolation, and a full end-to-end "store → verify → certify" lifecycle scenario. |
| **Server utilities** | Vitest (Node environment) | `test/utils/*.test.ts` (e.g. `session.server`, `auth.server`, `blockchain.server`) | Cookie session helpers (`getUserSession`, `getUserId`, `getUserRole`, `requireUserId`); auth guards (`getUser`, `requireUser`, `requireAdmin`, `requireProfessor`, `requireStudent`) with the Prisma client mocked; the entire `ethers.js` contract binding layer (`storeDocumentHash`, `verifyDocumentHash`, `recordVerificationOnChain`, `lookupVerificationOnChain`, `isBlockchainAvailable`, and the "missing env var" configuration guards) with `ethers` fully mocked so **no live RPC connection is required to run the suite**. |
| **Routes (loaders/actions)** | Vitest (Node environment) | `test/routes/*.test.ts` (`login`, `admin.users`, `professor.upload`, `verify`) | Server-side request handling: redirect behavior for unauthenticated/unauthorized users, form validation, login success/failure paths (with `bcryptjs` mocked), full document-upload pipeline (multipart parsing, hashing, blockchain write, DB upsert, auto-certificate issuance — with `db`, `blockchain.server`, and the Remix multipart parser all mocked), CRUD flows for user management, and both public verification routes (with `qrcode` mocked). |
| **React components** | Vitest + Testing Library + `happy-dom` | `test/components/*.test.tsx` (e.g. `StatsCard`) | Rendering output, conditional rendering (optional props), accent-color theming across all variants, and basic accessibility/semantic-order assertions — using `// @vitest-environment happy-dom` per-file directives to opt selected files into a DOM environment without forcing it on the whole (mostly Node-side) suite. |

### Running the tests

```bash
# Smart-contract suite (Hardhat/Chai) — spins up an ephemeral in-memory chain per run
npm run test:contract

# App-level suite (Vitest: utils, routes, components) — fully mocked, no live services needed
npm test

# Watch mode while developing
npm run test:watch

# Run EVERYTHING (contract suite, then app suite) — what CI should run
npm run test:all

# Generate a coverage report (text summary + HTML report under ./coverage)
npm run test:coverage
```

### Design choices worth knowing about

- **No live services required.** The Vitest suite mocks `ethers`, the Prisma client, `bcryptjs`, `qrcode`, and the Remix multipart form parser. You can run `npm test` without the Hardhat node, the dev server, or even a populated database running. This keeps the suite fast and deterministic, and makes it CI-friendly out of the box.
- **The contract suite is isolated on purpose.** `test/AcademicVerification.test.cjs` runs under Hardhat's own Mocha-based runner (`npm run test:contract`) rather than Vitest, because it needs a real (ephemeral, in-process) EVM to deploy against and assert on emitted events/reverts — something a mock can't faithfully reproduce. `vitest.config.ts` explicitly excludes this file from the Vitest run to avoid runner conflicts.
- **Coverage thresholds are scoped to server-side logic.** `vitest.config.ts` sets thresholds of `statements: 50, branches: 35, functions: 25, lines: 50`. These are intentionally lower than a typical "100% or bust" target because Remix route files mix two very different kinds of code in one file: server `loader`/`action` functions (thoroughly unit-tested here) and React UI markup (best covered by browser-based/E2E tests, which are out of scope for this fast unit suite). The thresholds reflect realistic, honest coverage of the business-logic half of those files — inflating them by writing shallow component-rendering tests just to hit a number would add noise without adding confidence.
- **Constructor-mock gotcha (documented in `blockchain.server.test.ts`):** `vi.mock("ethers", …)` must hand back constructor-shaped mocks for `JsonRpcProvider`, `Wallet`, and `Contract` (the real code calls them with `new`). Arrow functions cannot be used as `new` targets, so the mocks use **named regular `function` expressions** wrapping shared module-scope objects — this works because Vitest hoists `vi.mock` factories to run lazily on first import, *after* the module's top-level `const` declarations have already initialized.

## Troubleshooting

### "Nothing works" / blockchain calls fail / uploads error out after restarting your machine or terminals

**Symptom:** The app loads, but uploading a document (or anything else that touches the blockchain) fails with an error like `could not decode result data`, `call revert exception`, or the contract appears to return empty/zero values for everything.

**Cause:** The Hardhat node (`npm run chain`) keeps its entire blockchain — including any deployed contracts — **in memory**. Every time you stop and restart it, it comes back as a brand-new, empty chain. The address in your `.env`'s `CONTRACT_ADDRESS` now points at an address with **no code deployed** (`eth_getCode` returns `0x`), even though it's the same address as before.

**Fix:** After *every* restart of `npm run chain`, redeploy the contract:

```bash
npm run deploy:contract
```

Because of deterministic `CREATE` address derivation (see the note in step 6 of Setup), this will almost always print the **same address** that's already in your `.env` — so most of the time you don't need to edit anything, just re-run the deploy script and the app will work again. Only update `.env` if a *different* address is printed.

### `npm install` fails with `ETARGET` / "No matching version found"

Some `package.json` version ranges (e.g. an old pin like `@vitest/coverage-v8@^2.3.0`) may no longer resolve if the ecosystem has moved on. Check the latest available version (`npm info <package> version`) and either update the pin in `package.json` or install without a version specifier (`npm install -D <package>`) to pick up a current compatible release, then re-run `npm install`.

### Login fails for the seeded demo accounts

Make sure you actually ran the seed script *after* the database was created:

```bash
npx prisma db push
npx prisma generate
npm run seed
```

If you've previously seeded and are now getting unique-constraint errors, the accounts likely already exist — just log in with the credentials from the [Demo Accounts](#demo-accounts) table.

### Contract compile errors / "artifact not found"

Run the compile step explicitly before deploying — the deploy script and the runtime contract bindings both expect compiled artifacts under `artifacts/`:

```bash
npx hardhat compile --config hardhat.config.cjs
```

### Port conflicts (`5173` or `8545` already in use)

Stop any other process bound to those ports, or override them (Vite's dev server respects `--port`; Hardhat's node respects `--port` too — just remember to update `BLOCKCHAIN_RPC_URL` and restart/redeploy if you change `8545`).

## Production Notes

This project is configured for **local development and demonstration**. Before deploying it anywhere real, you should:

- **Move off the local Hardhat chain.** Hardhat's `npm run chain` is an ephemeral, single-machine, in-memory development chain — it is *not* suitable for production. Point `BLOCKCHAIN_RPC_URL` at a real network (a public testnet like Sepolia for staging, or a production network/L2 such as Polygon for live use), and deploy the contract there with a tool like Hardhat Ignition or a dedicated deployment pipeline.
- **Replace `DEPLOYER_PRIVATE_KEY`.** The shipped key is Hardhat's publicly-known account #0 — funds sent to it on a real network would be stolen instantly. Use a dedicated, funded wallet whose key is stored in a proper secrets manager, never in source control or a plain `.env` committed to a repo.
- **Move the database off SQLite onto a server-based engine** if you expect concurrent writers, need backups/replication, or want to scale horizontally. SQLite is great for a single-process demo but isn't designed for multi-instance production deployments. To switch to PostgreSQL/MySQL: update the `datasource` block in `prisma/schema.prisma` to the new `provider` and `url = env("DATABASE_URL")`, point `DATABASE_URL` at your real connection string, and run a fresh migration.
- **Set a strong, unique `SESSION_SECRET`** and run with `NODE_ENV=production`.
- **Persist uploaded files**, not just their hashes. Currently the system hashes documents and discards the original bytes — for a real deployment you'd want to store the originals (e.g. in S3 or equivalent object storage) so they can be retrieved, re-verified, or audited later, while continuing to use the chain as the integrity anchor.
- **Add monitoring around blockchain availability.** `isBlockchainAvailable()` already exists as a health-check primitive (see `app/utils/blockchain.server.ts`) — wire it into your readiness/liveness probes so you get alerted before users hit failed uploads.
- **Run the full test suite in CI** (`npm run test:all`) on every change, and consider adding browser-based end-to-end tests to cover the React UI surfaces that the current unit-test layer intentionally leaves to integration testing (see [Automated Test Suite](#automated-test-suite)).
