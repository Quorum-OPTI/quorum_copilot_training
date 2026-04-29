import "dotenv/config";
import { auth } from "../src/auth.js";
import { prisma } from "../src/prisma.js";

const DEMO_USERS = [
  { email: "alice@example.com", password: "password123", name: "Alice Demo" },
  { email: "bob@example.com", password: "password123", name: "Bob Demo" },
];

async function main() {
  for (const u of DEMO_USERS) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      console.log(`skip: ${u.email} already exists`);
      continue;
    }
    await auth.api.signUpEmail({
      body: { email: u.email, password: u.password, name: u.name },
    });
    console.log(`created: ${u.email}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
