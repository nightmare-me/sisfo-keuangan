import { prisma } from "./lib/prisma";

async function main() {
  const count = await prisma.karyawanProfile.count();
  console.log("Total KaryawanProfile:", count);
  
  const users = await prisma.user.findMany({
    where: { aktif: true },
    include: { karyawanProfile: true }
  });
  
  console.log("Users with profile:");
  users.forEach(u => {
    console.log(`- ${u.name} (${u.email}): ${u.karyawanProfile ? 'HAS PROFILE' : 'NO PROFILE'}`);
  });
}

main();
