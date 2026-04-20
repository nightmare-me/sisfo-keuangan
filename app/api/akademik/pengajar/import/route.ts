import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await request.json();
    if (!Array.isArray(data)) {
      return NextResponse.json({ error: "Format data harus berupa array" }, { status: 400 });
    }

    // Role Lookup
    const roleObj = await prisma.role.findFirst({
      where: { slug: { in: ['pengajar', 'tutor'] } }
    });

    if (!roleObj) {
      return NextResponse.json({ error: "Role 'PENGAJAR' tidak ditemukan" }, { status: 404 });
    }

    let successCount = 0;
    let skipCount = 0;
    const errors = [];

    for (const item of data) {
      try {
        const name = item.nama;
        const email = item.email?.toLowerCase().trim();
        const password = item.password || "Speaking123!"; // Default password if empty

        if (!name || !email) {
          skipCount++;
          continue;
        }

        // Check Duplicate
        const existing = await prisma.user.findUnique({
          where: { email }
        });

        if (existing) {
          skipCount++;
          continue;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              name,
              email,
              password: hashedPassword,
              roleId: roleObj.id,
              aktif: true
            }
          });

          await tx.karyawanProfile.create({
            data: {
              userId: user.id,
              nik: String(item.nik || ""),
              posisi: item.posisi || "Pengajar",
              bankName: item.bank,
              rekeningNomor: String(item.no_rekening || ""),
              rekeningNama: item.nama_rekening || name,
              gajiPokok: 0
            }
          });
        });

        successCount++;
      } catch (err: any) {
        errors.push({ email: item.email, error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Impor Selesai: ${successCount} berhasil, ${skipCount} dilewati (duplikat/kosong).`,
      errors: errors.slice(0, 10) // Tampilkan 10 error pertama jika ada
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
