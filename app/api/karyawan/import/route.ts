import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session || !(["ADMIN", "FINANCE"].includes(role))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await request.json();
    if (!Array.isArray(data)) {
      return NextResponse.json({ error: "Data must be an array" }, { status: 400 });
    }

    let successCount = 0;
    let errorCount = 0;

    // Pre-cache all roles for matching
    const allRoles = await prisma.role.findMany();

    for (const item of data) {
      try {
        const email = item.email?.toLowerCase().trim();
        if (!email) continue;

        // Find match for role name/slug
        const roleName = item.role?.toLowerCase() || 'cs';
        const targetRole = allRoles.find(r => 
          r.name.toLowerCase() === roleName || 
          r.slug.toLowerCase() === roleName
        );

        let user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
          // Create new user if not exists
          const hashedPassword = await bcrypt.hash("password123", 10);
          user = await prisma.user.create({
            data: {
              email,
              name: item.nama || "Karyawan Baru",
              password: hashedPassword,
              roleId: targetRole?.id || allRoles[0]?.id || "",
              aktif: true
            }
          });
        } else if (targetRole) {
          // Update role if user already exists
          await prisma.user.update({
            where: { id: user.id },
            data: { roleId: targetRole.id }
          });
        }

        // Upsert KaryawanProfile
        await prisma.karyawanProfile.upsert({
          where: { userId: user.id },
          update: {
            nik: item.nik || undefined,
            posisi: item.posisi || undefined,
            gajiPokok: parseFloat(item.gajipokok || 0),
            tunjangan: parseFloat(item.tunjangan || 0),
            bankName: item.bank || undefined,
            rekeningNomor: item.rekeningnomor || undefined,
            rekeningNama: item.rekeningnama || undefined,
          },
          create: {
            userId: user.id,
            nik: item.nik || null,
            posisi: item.posisi || "Staf",
            gajiPokok: parseFloat(item.gajipokok || 0),
            tunjangan: parseFloat(item.tunjangan || 0),
            bankName: item.bank || null,
            rekeningNomor: item.rekeningnomor || null,
            rekeningNama: item.rekeningnama || null,
          }
        });

        successCount++;
      } catch (err) {
        console.error(`Import error for ${item.email}:`, err);
        errorCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Berhasil mengimpor ${successCount} data. ${errorCount} gagal.`,
      successCount,
      errorCount
    });

  } catch (error: any) {
    console.error("Fatal import error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
