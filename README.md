# Academic Integrity Verification System (AIVS)

A blockchain-based web application that verifies student academic records (attendance, transcript, exam results) and issues tamper-proof certificates.

## Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | Remix v2, React 18, Tailwind CSS    |
| Backend    | Remix (Node.js)                     |
| Blockchain | Solidity 0.8.19, Ethers.js v6       |
| Local chain| Hardhat (Ethereum dev node)         |
| Database   | PostgreSQL + Prisma ORM             |
| Auth       | Cookie sessions + bcryptjs          |
| QR Code    | qrcode npm package                  |

## Architecture

```
Professor uploads file
      │
      ▼
Server generates SHA-256 hash
      │
      ├──► Store hash on Ethereum blockchain (Solidity contract)
      │         └─ Returns transaction hash
      │
      └──► Save document info to PostgreSQL
                │
                ▼
           All 3 docs present?
                │
               YES
                │
                ▼
     Generate Verification Certificate
      ├──► Record on blockchain
      └──► Save to PostgreSQL
```

## Prerequisites

- Node.js 20+
- PostgreSQL running locally
- Git

## Setup Instructions

### 1. Clone and install dependencies

```bash
cd "blchain project"
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set your `DATABASE_URL`:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/aivs_db"
SESSION_SECRET="change-this-to-a-long-random-string"
```

### 3. Set up the database

Create the database in PostgreSQL:

```sql
CREATE DATABASE aivs_db;
```

Push the Prisma schema:

```bash
npx prisma db push
npx prisma generate
```

Seed demo users:

```bash
npm run seed
```

### 4. Compile the Solidity smart contract

```bash
npx hardhat compile --config hardhat.config.cjs
```

### 5. Start the local Ethereum blockchain

Open a **new terminal** and run:

```bash
npm run chain
# Keeps running — leave this terminal open
```

This starts a Hardhat node at `http://127.0.0.1:8545` with 20 pre-funded accounts.

### 6. Deploy the smart contract

In another terminal:

```bash
npm run deploy:contract
```

Copy the printed `CONTRACT_ADDRESS` into your `.env`:

```env
CONTRACT_ADDRESS="0x..."
DEPLOYER_PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
```

> The default `DEPLOYER_PRIVATE_KEY` is Hardhat account #0 — safe for local dev only.

### 7. Start the development server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Demo Accounts

| Role      | Email                        | Password      |
|-----------|------------------------------|---------------|
| Admin     | admin@university.edu         | admin123      |
| Professor | prof.smith@university.edu    | professor123  |
| Student   | alice@university.edu         | student123    |
| Student   | bob@university.edu           | student123    |
| Student   | carol@university.edu         | student123    |

## How to test the full flow

1. **Sign in as Professor** → Upload an Attendance file for Alice (STU-2024-001)
2. **Upload Transcript** for Alice
3. **Upload Exam Results** for Alice → Certificate is automatically issued
4. **Sign out**, **Sign in as Alice** → See the certificate and download it
5. **Go to `/verify`** → Enter `STU-2024-001` → See the public verification result
6. **Scan the QR code** on the certificate → Opens the public verification page

## Smart Contract

Located at `contracts/AcademicVerification.sol`

### Key functions

| Function | Description |
|----------|-------------|
| `storeHash(studentId, docType, fileHash)` | Store a SHA-256 document hash |
| `verifyHash(studentId, docType, fileHash)` | Compare a hash against the stored one |
| `getHash(studentId, docType)` | Get stored hash + timestamp + uploader address |
| `recordVerification(studentId, verificationId)` | Record a final certificate on-chain |
| `lookupVerification(verificationId)` | Return studentId for a verificationId |
| `checkDocumentExists(studentId, docType)` | Check if a document has been stored |

## Pages

| URL | Description |
|-----|-------------|
| `/login` | Login for all roles |
| `/admin` | Admin dashboard |
| `/admin/users` | Create / delete users |
| `/professor` | Professor dashboard — all students with status |
| `/professor/upload` | Upload a document for a student |
| `/student` | Student's own verification status + certificate |
| `/verify` | Public search — enter student ID or verification ID |
| `/verify/:id` | Full printable certificate with QR code |

## Tamper Detection

If someone modifies a document and re-uploads it:

1. The server generates a new SHA-256 hash
2. The new hash is stored on-chain (overwrites the old one)
3. Anyone who had the old hash and tries to `verifyHash()` will get `false`

The blockchain provides an immutable audit trail — every `storeHash` call emits a `DocumentStored` event with timestamp and uploader address.

## PostgreSQL Schema

```
users                    — all users (admin / professor / student)
documents                — uploaded documents with SHA-256 hashes
verification_certificates — final certificates for fully-verified students
```

## Production Notes

- Replace `DEPLOYER_PRIVATE_KEY` with a dedicated funded wallet
- Use a public/private Ethereum network (Polygon, Sepolia testnet, etc.)
- Set `NODE_ENV=production` and use a proper `SESSION_SECRET`
- Store uploaded files in S3 or similar (currently files are only hashed, not stored)
