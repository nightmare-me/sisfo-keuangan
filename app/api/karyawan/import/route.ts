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

    const results = { successCount: 0, failedCount: 0, errors: [] as string[] };

    // Helper untuk validasi tanggal
    const safeDate = (val: any) => {
      if (!val || String(val).trim() === "") return null;
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    };

    for (const rawItem of data) {
      // Helper to find values regardless of header casing/spacing
      const getVal = (keys: string[]) => {
        for (const key of keys) {
          const normalized = key.toLowerCase().trim();
          for (const [k, v] of Object.entries(rawItem)) {
            const rowKey = k.toLowerCase().trim().replace(/[\s\.]+/g, '_');
            const targetKey = normalized.replace(/[\s\.]+/g, '_');
            if (rowKey === targetKey) return v;
          }
        }
        return null;
      };

      const item = {
        email: getVal(['email']),
        nama: getVal(['nama', 'name', 'nama_lengkap', 'nama lengkap']),
        nama_panggilan: getVal(['nama_panggilan', 'panggilan', 'nama panggilan']),
        no_hp: getVal(['no_hp', 'no hp', 'whatsapp', 'telepon', 'no. hp']),
        posisi: getVal(['posisi', 'jabatan', 'position']),
        role: getVal(['role', 'role_slug', 'sub_role', 'jabatan_sistem']),
        team_type: getVal(['team_type', 'kategori_tim', 'team type', 'teamType']),
        nip: getVal(['nip', 'no_karyawan', 'nomor induk', 'no. karyawan']),
        nik: getVal(['nik', 'no_ktp', 'nomor ktp', 'nik ktp']),
        tempat_lahir: getVal(['tempat_lahir', 'tempat lahir', 'birthplace']),
        tanggal_lahir: getVal(['tanggal_lahir', 'tanggal lahir', 'birthdate']),
        jenis_kelamin: getVal(['jenis_kelamin', 'jenis kelamin', 'gender', 'jk']),
        alamat: getVal(['alamat', 'alamat lengkap', 'address']),
        status_pernikahan: getVal(['status_pernikahan', 'status pernikahan', 'status', 'marital']),
        tanggal_masuk: getVal(['tanggal_masuk', 'tanggal masuk', 'join date', 'tgl masuk']),
        tanggal_resign: getVal(['tanggal_resign', 'tanggal resign', 'resign date']),
        bank_name: getVal(['bank_name', 'nama_bank', 'bank', 'nama bank']),
        rekening_nomor: getVal(['rekening_nomor', 'no_rekening', 'nomor rekening', 'no. rekening']),
        rekening_nama: getVal(['rekening_nama', 'pemilik_rekening', 'nama rekening', 'nama pemilik rekening']),
        gaji_pokok: getVal(['gaji_pokok', 'gaji pokok', 'gapok', 'salary']),
        tunjangan: getVal(['tunjangan', 'tunjangan tetap', 'allowance']),
        fee_closing: getVal(['fee_closing', 'fee closing', 'closing fee']),
        fee_lead: getVal(['fee_lead', 'fee lead', 'lead fee']),
        bonus_target: getVal(['bonus_target', 'bonus target', 'target unit']),
        bonus_nominal: getVal(['bonus_nominal', 'bonus nominal', 'nominal bonus'])
      };

      const email = item.email ? String(item.email).toLowerCase().trim() : null;
      if (!email) {
        results.failedCount++; results.errors.push("Email kosong di salah satu baris");
        continue;
      }

      try {
        // 1. Role & SubRole Matching (Smart Lookup)
        const inputRole = String(item.role || 'cs').toLowerCase().trim();
        
        // Cari di Sub-Role dulu
        let targetSubRole = allSubRoles.find((sr: any) => 
          sr.name.toLowerCase() === inputRole
        );

        // Fallback: Jika tidak ketemu di kolom role, cari berdasarkan kolom posisi
        if (!targetSubRole && item.posisi) {
          const inputPosisi = String(item.posisi).toLowerCase().trim();
          targetSubRole = allSubRoles.find((sr: any) => 
            sr.name.toLowerCase() === inputPosisi
          );
        }

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
          const teamTypeRaw = item.team_type || "";
          const teamType = teamTypeRaw 
            ? String(teamTypeRaw).split(',').map(t => t.trim().toUpperCase()).filter(Boolean)
            : [];

          user = await prisma.user.create({
            data: {
              email,
              name: item.nama || "Karyawan Baru",
              namaPanggilan: item.nama_panggilan || null,
              noHp: String(item.no_hp || ""),
              password: hashedPassword,
              roleId: finalRoleId,
              subRoleId: finalSubRoleId,
              teamType: teamType,
              aktif: true
            }
          });
        } else {
          // Update user if already exists
          const teamTypeRaw = item.team_type || "";
          const teamType = teamTypeRaw 
            ? String(teamTypeRaw).split(',').map(t => t.trim().toUpperCase()).filter(Boolean)
            : undefined;

          await prisma.user.update({
            where: { id: user.id },
            data: { 
              roleId: finalRoleId,
              subRoleId: finalSubRoleId,
              namaPanggilan: item.nama_panggilan || undefined,
              noHp: item.no_hp ? String(item.no_hp) : undefined,
              teamType: teamType
            }
          });
        }

        // 3. Generate/Get NIP
        let nip = item.nip ? String(item.nip).trim() : null;
        if (!nip) {
          const existingProfile = await prisma.karyawanProfile.findUnique({ where: { userId: user.id } });
          nip = existingProfile?.nip || null;
        }
        if (!nip) {
          lastNum++;
          nip = `SP-${lastNum.toString().padStart(5, "0")}`;
        }

        // 4. Karyawan Profile Upsert
        const profileData = {
          nip,
          posisi: item.posisi ? String(item.posisi) : null,
          nik: item.nik ? String(item.nik).trim() : null,
          tempatLahir: item.tempat_lahir ? String(item.tempat_lahir) : null,
          tanggalLahir: safeDate(item.tanggal_lahir),
          jenisKelamin: item.jenis_kelamin ? String(item.jenis_kelamin) : null,
          alamat: item.alamat ? String(item.alamat) : null,
          statusPernikahan: item.status_pernikahan ? String(item.status_pernikahan) : null,
          tanggalMasuk: safeDate(item.tanggal_masuk),
          tanggalResign: safeDate(item.tanggal_resign),
          bankName: item.bank_name ? String(item.bank_name) : null,
          rekeningNomor: item.rekening_nomor ? String(item.rekening_nomor) : null,
          rekeningNama: item.rekening_nama ? String(item.rekening_nama) : null,
          gajiPokok: parseFloat(String(item.gaji_pokok || 0)),
          tunjangan: parseFloat(String(item.tunjangan || 0)),
          feeClosing: parseFloat(String(item.fee_closing || 0)),
          feeLead: parseFloat(String(item.fee_lead || 0)),
          bonusTarget: parseInt(String(item.bonus_target || 0)),
          bonusNominal: parseFloat(String(item.bonus_nominal || 0)),
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

        results.successCount++;
      } catch (err: any) {
        console.error(`Import error for ${email}:`, err.message);
        results.failedCount++;
        results.errors.push(`${email}: ${err.message}`);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Impor selesai: ${results.successCount} sukses, ${results.failedCount} gagal.`,
      ...results
    });

  } catch (error: any) {
    console.error("Fatal import error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
