/**
 * Seed the database with demo users.
 * Run: npm run seed
 *
 * Requires: DATABASE_URL in .env
 */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const db = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const adminPass  = await bcrypt.hash("admin123",     10);
  const profPass   = await bcrypt.hash("professor123", 10);
  const studentPass = await bcrypt.hash("student123",   10);

  // Admin
  await db.user.upsert({
    where:  { email: "admin@university.edu" },
    update: {},
    create: { email: "admin@university.edu", password: adminPass, name: "System Admin", role: "ADMIN" },
  });

  // Professor
  await db.user.upsert({
    where:  { email: "prof.smith@university.edu" },
    update: {},
    create: { email: "prof.smith@university.edu", password: profPass, name: "Professor Smith", role: "PROFESSOR" },
  });

  // Students
  const students = [
    { email: "alice@university.edu", name: "Alice Johnson",   studentId: "STU-2024-001" },
    { email: "bob@university.edu",   name: "Bob Williams",    studentId: "STU-2024-002" },
    { email: "carol@university.edu", name: "Carol Martinez",  studentId: "STU-2024-003" },
  ];

  for (const s of students) {
    await db.user.upsert({
      where:  { email: s.email },
      update: {},
      create: { email: s.email, password: studentPass, name: s.name, role: "STUDENT", studentId: s.studentId },
    });
  }

  console.log("Seeded:");
  console.log("  admin@university.edu       / admin123");
  console.log("  prof.smith@university.edu  / professor123");
  console.log("  alice@university.edu       / student123  (STU-2024-001)");
  console.log("  bob@university.edu         / student123  (STU-2024-002)");
  console.log("  carol@university.edu       / student123  (STU-2024-003)");
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
