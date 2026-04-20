const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
require("dotenv").config();

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL not set");

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log("Checking Roles & Permissions...");

  // 1. Pastikan Role AKADEMIK ada
  const roleAkademik = await prisma.role.upsert({
    where: { slug: "akademik" },
    update: {},
    create: {
      name: "AKADEMIK",
      slug: "akademik",
      description: "Manajemen data akademik dan pengajar"
    }
  });
  console.log("Role AKADEMIK ready.");

  // 2. Daftar Permission baru
  const permissions = [
    { slug: "pengajar:view", name: "Lihat Data Pengajar" },
    { slug: "pengajar:manage", name: "Kelola Data Pengajar" }
  ];

  const permissionIds = [];
  for (const p of permissions) {
    const createdP = await prisma.permission.upsert({
      where: { slug: p.slug },
      update: { name: p.name },
      create: { slug: p.slug, name: p.name }
    });
    permissionIds.push(createdP.id);
    console.log(`Permission ${p.slug} ready.`);
  }

  // 3. Berikan ke ADMIN dan AKADEMIK menggunakan relasi Connect
  const targetRoles = ["admin", "akademik"];
  for (const roleSlug of targetRoles) {
    const role = await prisma.role.findUnique({ 
        where: { slug: roleSlug },
        include: { permissions: true }
    });

    if (role) {
      // Filter mana yang belum tersambung
      const existingSlugs = role.permissions.map(p => p.slug);
      const toConnect = permissions
        .filter(p => !existingSlugs.includes(p.slug))
        .map(p => ({ slug: p.slug }));

      if (toConnect.length > 0) {
        await prisma.role.update({
          where: { id: role.id },
          data: {
            permissions: {
              connect: toConnect
            }
          }
        });
        console.log(`Added ${toConnect.length} new permissions to ${roleSlug.toUpperCase()}.`);
      } else {
        console.log(`All permissions already assigned to ${roleSlug.toUpperCase()}.`);
      }
    }
  }

  await pool.end();
  console.log("Setup complete!");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
