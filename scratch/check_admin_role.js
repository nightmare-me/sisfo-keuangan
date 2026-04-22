const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkAdmin() {
  const user = await prisma.user.findFirst({
    where: { name: "Administrator" },
    include: { role: true }
  });
  
  console.log("=== DATA USER ADMIN ===");
  console.log("ID:", user?.id);
  console.log("Nama:", user?.name);
  console.log("Role Slug:", user?.role?.slug);
  console.log("Role Name:", user?.role?.nama);
  console.log("========================");
  
  await prisma.$disconnect();
}

checkAdmin().catch(console.error);
