import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL || "postgresql://localhost:5432/dsl?schema=public" });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding...");
  const hash = await bcrypt.hash("admin123", 10);

  await prisma.user.create({
    data: { doubanUid: "admin", doubanName: "管理员", passwordHash: hash, role: "ADMIN", status: "ACTIVE" },
  });

  await prisma.secret.create({
    data: { slug: "demo", title: "示例密文", content: "示例内容。验证数字：1234", verifyCode: "1234", creatorName: "管理员", creatorUid: "admin" },
  });

  console.log("Done. Admin: uid=admin, password=admin123");
  console.log("Demo: http://localhost:3006/s/demo (verify: 1234)");
  console.log("Admin panel: http://localhost:3006/admin");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
