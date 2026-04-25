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

    const [allRoles, allSubRoles] = await Promise.all([
      prisma.role.findMany(),
      prisma.subRole.findMany({ include: { role: true } })
    ]);

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

    const safeDate = (val: any) => {
      if (!val || String(val).trim() === "") return undefined;
      let s = String(val).trim();
      
      if (s.match(/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/)) {
        const parts = s.split(/[\/\-]/);
        s = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }

      const d = new Date(s);
      return isNaN(d.getTime()) ? undefined : d;
    };

    const cleanStr = (val: any) => {
      if (!val) return undefined;
      const s = String(val).replace(/[^\x20-\x7E\u00A0-\u00FF]/g, '').trim();
      return s || undefined;
    };

    for (const rawItem of data) {
      const getVal = (keys: string[]) => {
        for (const key of keys) {
          const target = key.toLowerCase().trim().replace(/[\s\.\-]+/g, '_');
          for (const [k, v] of Object.entries(rawItem)) {
            const rowKey = k.toLowerCase().replace(/[^\x20-\x7E]/g, '').trim().replace(/[\s\.\-]+/g, '_');
            if (rowKey === target) return v;
          }
        }
        return null;
      };

      const fixExcelNumber = (val: any) => {
        if (!val) return "";
        let s = String(val).trim();
        if (s.toLowerCase().includes('e+') || s.includes(',')) {
          const clean = s.replace(',', '.');
          const num = Number(clean);
          if (!isNaN(num)) return BigInt(Math.round(num)).toString();
        }
        return s;
      };

      const item = {
        email: String(getVal(['email']) || "").toLowerCase().trim(),
        nama: cleanStr(getVal(['nama', 'name', 'nama_lengkap', 'nama lengkap'])),
        nama_panggilan: cleanStr(getVal(['nama_panggilan', 'panggilan', 'nama panggilan'])),
        no_hp: fixExcelNumber(getVal(['no_hp', 'no hp', 'whatsapp', 'telepon', 'no. hp'])),
        posisi: cleanStr(getVal(['posisi', 'jabatan', 'position'])),
        role: cleanStr(getVal(['role', 'role_slug', 'sub_role', 'jabatan_sistem'])),
        team_type: cleanStr(getVal(['team_type', 'kategori_tim', 'team type'])),
        nip: cleanStr(getVal(['nip', 'no_karyawan', 'nomor induk', 'no. karyawan'])),
        nik: fixExcelNumber(getVal(['nik', 'no_ktp', 'nomor ktp', 'nik ktp'])),
        tempat_lahir: cleanStr(getVal(['tempat_lahir', 'tempat lahir'])),
        tanggal_lahir: getVal(['tanggal_lahir', 'tanggal lahir', 'birthdate']),
        jenis_kelamin: cleanStr(getVal(['jenis_kelamin', 'jenis kelamin', 'gender', 'jk'])),
        alamat: cleanStr(getVal(['alamat', 'alamat lengkap', 'address'])),
        status_pernikahan: cleanStr(getVal(['status_pernikahan', 'status pernikahan', 'status'])),
        tanggal_masuk: getVal(['tanggal_masuk', 'tanggal masuk', 'join date']),
        tanggal_resign: getVal(['tanggal_resign', 'tanggal resign']),
        kontak_darurat: cleanStr(getVal(['kontak_darurat', 'kontak darurat', 'emergency'])),
        bank_name: cleanStr(getVal(['bank_name', 'nama_bank', 'bank'])),
        rekening_nomor: fixExcelNumber(getVal(['rekening_nomor', 'no_rekening', 'nomor rekening'])),
        rekening_nama: cleanStr(getVal(['rekening_nama', 'pemilik_rekening', 'nama pemilik'])),
        gaji_pokok: getVal(['gaji_pokok', 'gaji pokok', 'gapok', 'gajipokok']),
        tunjangan: getVal(['tunjangan', 'tunjangan tetap']),
        fee_closing: getVal(['fee_closing', 'fee closing']),
        fee_lead: getVal(['fee_lead', 'fee lead']),
        bonus_target: getVal(['bonus_target', 'bonus target']),
        bonus_nominal: getVal(['bonus_nominal', 'bonus nominal'])
      };

      console.log(`DEBUG IMPORT [${item.email}]:`, JSON.stringify(item, null, 2));

      if (!item.email) {
        results.failedCount++; results.errors.push("Email kosong di salah satu baris");
        continue;
      }

      try {
        const inputRole = String(item.role || 'cs').toLowerCase().trim();
        let targetSubRole = allSubRoles.find((sr: any) => sr.name.toLowerCase() === inputRole);
        if (!targetSubRole && item.posisi) {
          const inputPosisi = String(item.posisi).toLowerCase().trim();
          targetSubRole = allSubRoles.find((sr: any) => sr.name.toLowerCase() === inputPosisi);
        }

        let finalRoleId = "";
        let finalSubRoleId = null;

        if (targetSubRole) {
          finalSubRoleId = targetSubRole.id;
          finalRoleId = targetSubRole.roleId;
        } else {
          const targetRole = allRoles.find((r: any) => 
            r.name.toLowerCase() === inputRole || r.slug.toLowerCase() === inputRole
          );
          finalRoleId = targetRole?.id || allRoles.find(r => r.slug === 'cs')?.id || allRoles[0]?.id || "";
        }

        // --- NORMALIZE VALUES ---
        let jk = item.jenis_kelamin?.toUpperCase() || undefined;
        if (jk) {
          if (jk.startsWith('L')) jk = 'LAKI-LAKI';
          if (jk.startsWith('P')) jk = 'PEREMPUAN';
        }

        let status = item.status_pernikahan?.toUpperCase() || undefined;
        if (status) {
          if (status.includes('BELUM') || status.includes('LAJANG') || status === 'L') status = 'LAJANG';
          else if (status.includes('MENIKAH') || status.includes('KAWIN') || status === 'M') status = 'MENIKAH';
          else if (status.includes('CERAI')) status = 'CERAI';
        }

        let phone = item.no_hp || undefined;
        if (phone) {
          phone = String(phone).replace(/[^0-9+]/g, '');
          if (!phone.startsWith('0') && !phone.startsWith('+')) {
            phone = '0' + phone;
          }
        }

        let user = await prisma.user.findUnique({ where: { email: item.email } });
        const teamTypeRaw = item.team_type || "";
        const teamType = teamTypeRaw 
          ? String(teamTypeRaw).split(',').map(t => t.trim().toUpperCase()).filter(Boolean)
          : undefined;

        if (!user) {
          const hashedPassword = await bcrypt.hash("password123", 10);
          user = await prisma.user.create({
            data: {
              email: item.email,
              name: item.nama || "Karyawan Baru",
              namaPanggilan: item.nama_panggilan || null,
              noHp: phone || "",
              password: hashedPassword,
              roleId: finalRoleId,
              subRoleId: finalSubRoleId,
              teamType: teamType || [],
              aktif: true
            }
          });
        } else {
          await prisma.user.update({
            where: { id: user.id },
            data: { 
              name: item.nama || undefined,
              roleId: finalRoleId,
              subRoleId: finalSubRoleId,
              namaPanggilan: item.nama_panggilan || undefined,
              noHp: phone || undefined,
              teamType: teamType
            }
          });
        }

        let nip = item.nip ? String(item.nip).trim() : null;
        if (!nip) {
          const existingProfile = await prisma.karyawanProfile.findUnique({ where: { userId: user.id } });
          nip = existingProfile?.nip || null;
        }
        if (!nip) {
          lastNum++;
          nip = `SP-${lastNum.toString().padStart(5, "0")}`;
        }

        const cleanPrice = (val: any) => {
          if (!val) return undefined;
          const n = parseFloat(String(val).replace(/[^0-9.]/g, ''));
          return isNaN(n) ? undefined : n;
        };

        const profileData = {
          posisi: item.posisi || undefined,
          nik: item.nik || undefined,
          tempatLahir: item.tempat_lahir || undefined,
          tanggalLahir: safeDate(item.tanggal_lahir),
          jenisKelamin: jk,
          alamat: item.alamat || undefined,
          statusPernikahan: status,
          tanggalMasuk: safeDate(item.tanggal_masuk),
          tanggalResign: safeDate(item.tanggal_resign),
          kontakDarurat: item.kontak_darurat || undefined,
          bankName: item.bank_name || undefined,
          rekeningNomor: item.rekening_nomor || undefined,
          rekeningNama: item.rekening_nama || undefined,
          gajiPokok: cleanPrice(item.gaji_pokok),
          tunjangan: cleanPrice(item.tunjangan),
          feeClosing: cleanPrice(item.fee_closing),
          feeLead: cleanPrice(item.fee_lead),
          bonusTarget: item.bonus_target ? parseInt(String(item.bonus_target)) : undefined,
          bonusNominal: cleanPrice(item.bonus_nominal),
          nip: nip || undefined
        };

        const filteredProfileData = Object.fromEntries(
          Object.entries(profileData).filter(([_, v]) => v !== undefined)
        );

        if (filteredProfileData.nik) {
          const nikStr = String(filteredProfileData.nik);
          const isTruncated = nikStr.endsWith('000000');

          const nikExists = await prisma.karyawanProfile.findFirst({
            where: { nik: nikStr, NOT: { userId: user.id } }
          });

          if (nikExists) {
            console.warn(`NIK ${nikStr} duplicated for ${item.email}, skipping NIK update.`);
            delete (filteredProfileData as any).nik;
          } else if (isTruncated) {
             console.warn(`NIK ${nikStr} for ${item.email} looks truncated by Excel.`);
          }
        }

        await prisma.karyawanProfile.upsert({
          where: { userId: user.id },
          update: filteredProfileData,
          create: { ...filteredProfileData, userId: user.id } as any
        });

        results.successCount++;
      } catch (err: any) {
        console.error(`Import error for ${item.email}:`, err.message);
        results.failedCount++;
        results.errors.push(`${item.email}: ${err.message}`);
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
