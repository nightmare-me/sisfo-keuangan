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

    // Get the latest NIP once before starting the loop to avoid race conditions
    const lastProfileBase = await prisma.karyawanProfile.findFirst({
      where: { nip: { startsWith: "SP-", not: null } },
      orderBy: { nip: "desc" }
    });

    let lastNum = 0;
    if (lastProfileBase?.nip) {
      const num = parseInt(lastProfileBase.nip.replace("SP-", ""));
      if (!isNaN(num)) lastNum = num;
    }

    for (const item of data) {
      try {
        const email = item.email?.toLowerCase().trim();
        if (!email) continue;

        // Find match for role name/slug
        const roleName = item.role?.toLowerCase() || 'cs';
        const targetRole = allRoles.find((r: any) => 
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
              namaPanggilan: item.nama_panggilan || null,
              noHp: item.no_hp || null,
              password: hashedPassword,
              roleId: targetRole?.id || allRoles[0]?.id || "",
              aktif: true
            }
          });
        } else {
          // Update user if already exists
          await prisma.user.update({
            where: { id: user.id },
            data: { 
              roleId: targetRole?.id || undefined,
              namaPanggilan: item.nama_panggilan || undefined,
              noHp: item.no_hp || undefined,
            }
          });
        }

        // Get or Generate NIP
        let nip = item.nip || undefined;
        if (!nip) {
          lastNum++;
          nip = `SP-${lastNum.toString().padStart(5, "0")}`;
        }

        // Upsert KaryawanProfile
        const profileData: any = {
          nip,
          nik: item.nik || undefined,
          posisi: item.posisi || undefined,
          tempatLahir: item.tempat_lahir || undefined,
          tanggalLahir: item.tanggal_lahir ? new Date(item.tanggal_lahir) : undefined,
          jenisKelamin: item.jenis_kelamin || undefined,
          alamat: item.alamat || undefined,
          statusPernikahan: item.status_pernikahan || undefined,
          tanggalMasuk: item.tanggal_masuk ? new Date(item.tanggal_masuk) : undefined,
          tanggalResign: item.tanggal_resign ? new Date(item.tanggal_resign) : undefined,
          kontakDarurat: item.kontak_darurat || undefined,
          gajiPokok: parseFloat(item.gajipokok || 0),
          tunjangan: parseFloat(item.tunjangan || 0),
          bankName: item.bank || undefined,
          rekeningNomor: item.rekeningnomor || undefined,
          rekeningNama: item.rekeningnama || undefined,
        };

        await prisma.karyawanProfile.upsert({
          where: { userId: user.id },
          update: profileData,
          create: { ...profileData, userId: user.id }
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
