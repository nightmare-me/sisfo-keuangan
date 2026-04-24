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

    // Get the latest NIP once before starting the loop
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

        await prisma.$transaction(async (tx: any) => {
          const user = await tx.user.create({
            data: {
              name,
              email,
              namaPanggilan: item.nama_panggilan || item.namaPanggilan || null,
              noHp: item.no_hp || item.noHp || null,
              password: hashedPassword,
              roleId: roleObj.id,
              aktif: true
            }
          });

          // Get or Generate NIP
          let nip = item.nip || undefined;
          if (!nip) {
            lastNum++;
            nip = `SP-${lastNum.toString().padStart(5, "0")}`;
          }

          await tx.karyawanProfile.create({
            data: {
              userId: user.id,
              nip,
              nik: item.nik ? String(item.nik) : null,
              posisi: item.posisi || "Pengajar",
              tempatLahir: item.tempat_lahir || item.tempatLahir || null,
              tanggalLahir: (item.tanggal_lahir || item.tanggalLahir) ? new Date(item.tanggal_lahir || item.tanggalLahir) : null,
              jenisKelamin: item.jenis_kelamin || item.jenisKelamin || null,
              alamat: item.alamat || null,
              statusPernikahan: item.status_pernikahan || item.statusPernikahan || null,
              tanggalMasuk: (item.tanggal_masuk || item.tanggalMasuk) ? new Date(item.tanggal_masuk || item.tanggalMasuk) : new Date(),
              tanggalResign: (item.tanggal_resign || item.tanggalResign) ? new Date(item.tanggal_resign || item.tanggalResign) : null,
              kontakDarurat: item.kontak_darurat || item.kontakDarurat || null,
              bankName: item.bank || item.bankName || null,
              rekeningNomor: item.no_rekening || item.rekeningNomor || null,
              rekeningNama: item.nama_rekening || item.rekeningNama || name,
              gajiPokok: parseFloat(item.gajipokok || item.gajiPokok || 0),
              tunjangan: parseFloat(item.tunjangan || 0)
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
