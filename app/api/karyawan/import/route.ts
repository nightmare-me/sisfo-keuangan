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

    // Pre-cache all roles and sub-roles for matching
    const [allRoles, allSubRoles] = await Promise.all([
      prisma.role.findMany(),
      prisma.subRole.findMany({ include: { role: true } })
    ]);

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

    const results = { success: 0, failed: 0, errors: [] as string[] };

    // Helper untuk validasi tanggal
    const safeDate = (val: any) => {
      if (!val || String(val).trim() === "") return null;
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    };

    for (const item of data) {
      const email = item.email?.toLowerCase().trim();
      if (!email) {
        results.failed++; results.errors.push("Email kosong di salah satu baris");
        continue;
      }

      try {
        // 1. Role & SubRole Matching (Smart Lookup)
        const inputRole = (item.role || item.role_slug || 'cs').toLowerCase().trim();
        
        // Cari di Sub-Role dulu
        const targetSubRole = allSubRoles.find((sr: any) => 
          sr.name.toLowerCase() === inputRole
        );

        let finalRoleId = "";
        let finalSubRoleId = null;

        if (targetSubRole) {
          finalSubRoleId = targetSubRole.id;
          finalRoleId = targetSubRole.roleId;
        } else {
          // Kalau tidak ketemu di Sub-Role, cari di Role Utama
          const targetRole = allRoles.find((r: any) => 
            r.name.toLowerCase() === inputRole || 
            r.slug.toLowerCase() === inputRole
          );
          finalRoleId = targetRole?.id || allRoles.find(r => r.slug === 'cs')?.id || allRoles[0]?.id || "";
        }

        // 2. User Handling
        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          const hashedPassword = await bcrypt.hash("password123", 10);
          // Handle TeamType / Sub-Role (bisa satu atau banyak dipisah koma)
          const teamTypeRaw = item.team_type || item.kategori_tim || item.teamType || "";
          const teamType = teamTypeRaw 
            ? String(teamTypeRaw).split(',').map(t => t.trim().toUpperCase()).filter(Boolean)
            : [];

          user = await prisma.user.create({
            data: {
              email,
              name: item.nama || item.name || "Karyawan Baru",
              namaPanggilan: item.nama_panggilan || item.namaPanggilan || null,
              noHp: String(item.no_hp || item.noHp || ""),
              password: hashedPassword,
              roleId: finalRoleId,
              subRoleId: finalSubRoleId,
              teamType: teamType,
              aktif: true
            }
          });
        } else {
          // Update user if already exists
          const teamTypeRaw = item.team_type || item.kategori_tim || item.teamType || "";
          const teamType = teamTypeRaw 
            ? String(teamTypeRaw).split(',').map(t => t.trim().toUpperCase()).filter(Boolean)
            : undefined;

          await prisma.user.update({
            where: { id: user.id },
            data: { 
              roleId: finalRoleId,
              subRoleId: finalSubRoleId,
              namaPanggilan: item.nama_panggilan || undefined,
              noHp: item.no_hp || undefined,
              teamType: teamType
            }
          });
        }

        // 3. Generate/Get NIP
        let nip = item.nip ? String(item.nip).trim() : null;
        if (!nip) {
          lastNum++;
          nip = `SP-${lastNum.toString().padStart(5, "0")}`;
        }

        // 4. Data Formatting (Tahan Banting)
        const profileData: any = {
          nip,
          nik: item.nik ? String(item.nik).trim() : null,
          posisi: item.posisi || null,
          tempatLahir: item.tempat_lahir || item.tempatLahir || null,
          tanggalLahir: safeDate(item.tanggal_lahir || item.tanggalLahir),
          jenisKelamin: item.jenis_kelamin || item.jenisKelamin || null,
          alamat: item.alamat || null,
          statusPernikahan: item.status_pernikahan || item.statusPernikahan || null,
          tanggalMasuk: safeDate(item.tanggal_masuk || item.tanggalMasuk),
          tanggalResign: safeDate(item.tanggal_resign || item.tanggalResign),
          kontakDarurat: item.kontak_darurat || item.kontakDarurat || null,
          gajiPokok: parseFloat(String(item.gajipokok || item.gaji_pokok || 0).replace(/[^0-9.]/g, '') || "0"),
          tunjangan: parseFloat(String(item.tunjangan || 0).replace(/[^0-9.]/g, '') || "0"),
          bankName: item.bank || item.bank_name || item.bankName || null,
          rekeningNomor: item.rekeningnomor || item.rekening_nomor || item.rekeningNomor ? String(item.rekeningnomor || item.rekening_nomor || item.rekeningNomor) : null,
          rekeningNama: item.rekeningnama || item.rekening_nama || item.rekeningNama || null,
        };

        // 5. Upsert dengan Pengecekan Duplikat NIK (Manual agar pesan error jelas)
        if (profileData.nik) {
          const nikExists = await prisma.karyawanProfile.findFirst({
            where: { nik: profileData.nik, NOT: { userId: user.id } }
          });
          if (nikExists) throw new Error(`NIK ${profileData.nik} sudah dipakai oleh user lain`);
        }

        await prisma.karyawanProfile.upsert({
          where: { userId: user.id },
          update: profileData,
          create: { ...profileData, userId: user.id }
        });

        results.success++;
      } catch (err: any) {
        console.error(`Import error for ${email}:`, err.message);
        results.failed++;
        results.errors.push(`${email}: ${err.message}`);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Impor selesai: ${results.success} sukses, ${results.failed} gagal.`,
      ...results
    });

  } catch (error: any) {
    console.error("Fatal import error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
