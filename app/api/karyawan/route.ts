import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role?.toUpperCase();
  if (!session || !(["ADMIN", "FINANCE"].includes(role))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (userId) {
    const profile = await prisma.karyawanProfile.findUnique({
      where: { userId },
      include: { user: { select: { namaPanggilan: true, noHp: true } } }
    });
    if (!profile) return NextResponse.json(null);
    
    return NextResponse.json({
      ...profile,
      namaPanggilan: profile.user.namaPanggilan,
      noHp: profile.user.noHp
    });
  }

  // If no userId, return ALL users who are active so we can manage their employee data
  const allProfiles = await prisma.user.findMany({
    where: { 
      aktif: true
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: { select: { name: true } },
      karyawanProfile: true
    },
    orderBy: { name: 'asc' }
  });

  return NextResponse.json(allProfiles);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role?.toUpperCase();
  if (!session || !(["ADMIN", "FINANCE"].includes(role))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { userId, ...data } = body;

    if (!userId) return NextResponse.json({ error: "UserId required" }, { status: 400 });

    const { 
      namaPanggilan, noHp, 
      nip: inputNip, nik: inputNik, 
      ...profileFields 
    } = data;

    // 1. Update User fields
    await prisma.user.update({
      where: { id: userId },
      data: { 
        namaPanggilan: namaPanggilan || undefined, 
        noHp: noHp || undefined 
      }
    });

    const existing = await prisma.karyawanProfile.findUnique({ where: { userId } });
    
    // 2. Handle NIP
    let nip = inputNip || existing?.nip;
    if (!nip) {
      const lastProfile = await prisma.karyawanProfile.findFirst({
        where: { nip: { startsWith: "SP-", not: null } },
        orderBy: { nip: "desc" }
      });
      let nextNum = 1;
      if (lastProfile?.nip) {
        const currentNum = parseInt(lastProfile.nip.replace("SP-", ""));
        if (!isNaN(currentNum)) nextNum = currentNum + 1;
      }
      nip = `SP-${nextNum.toString().padStart(5, "0")}`;
    }

    // 3. Handle NIK (Unique check)
    const nik = inputNik || null;
    if (nik) {
      const nikExists = await prisma.karyawanProfile.findFirst({
        where: { nik, NOT: { userId } }
      });
      if (nikExists) return NextResponse.json({ error: "NIK sudah digunakan oleh karyawan lain" }, { status: 400 });
    }

    // 4. Format Numeric & Date Fields
    const finalProfileData = {
      posisi: profileFields.posisi || null,
      tempatLahir: profileFields.tempatLahir || null,
      tanggalLahir: profileFields.tanggalLahir ? new Date(profileFields.tanggalLahir) : null,
      jenisKelamin: profileFields.jenisKelamin || null,
      alamat: profileFields.alamat || null,
      statusPernikahan: profileFields.statusPernikahan || null,
      tanggalMasuk: profileFields.tanggalMasuk ? new Date(profileFields.tanggalMasuk) : null,
      tanggalResign: profileFields.tanggalResign ? new Date(profileFields.tanggalResign) : null,
      kontakDarurat: profileFields.kontakDarurat || null,
      bankName: profileFields.bankName || null,
      rekeningNomor: profileFields.rekeningNomor || null,
      rekeningNama: profileFields.rekeningNama || null,
      keterangan: profileFields.keterangan || null,
      gajiPokok: parseFloat(profileFields.gajiPokok || 0),
      tunjangan: parseFloat(profileFields.tunjangan || 0),
      feeClosing: parseFloat(profileFields.feeClosing || 0),
      feeLead: parseFloat(profileFields.feeLead || 0),
      bonusTarget: parseInt(profileFields.bonusTarget || 0),
      bonusNominal: parseFloat(profileFields.bonusNominal || 0),
      nip,
      nik
    };

    const profile = await prisma.karyawanProfile.upsert({
      where: { userId },
      update: finalProfileData,
      create: { ...finalProfileData, userId }
    });

    return NextResponse.json(profile);
  } catch (error: any) {
    console.error("Error saving karyawan profile:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role?.toUpperCase();
  if (!session || !(["ADMIN", "FINANCE"].includes(role))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { ids } = await request.json();
    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json({ error: "Invalid IDs" }, { status: 400 });
    }

    await prisma.karyawanProfile.deleteMany({
      where: { userId: { in: ids } }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting profiles:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
