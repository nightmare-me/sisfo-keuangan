import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session || !(["ADMIN", "FINANCE"].includes(role))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (userId) {
    const profile = await prisma.karyawanProfile.findUnique({
      where: { userId }
    });
    return NextResponse.json(profile || null);
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
  const role = (session?.user as any)?.role;
  if (!session || !(["ADMIN", "FINANCE"].includes(role))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { userId, ...data } = body;

    if (!userId) return NextResponse.json({ error: "UserId required" }, { status: 400 });

    const existing = await prisma.karyawanProfile.findUnique({ where: { userId } });
    
    let nik = data.nik || existing?.nik;
    if (nik === "SP-***** (Generated)") nik = null;

    if (!nik) {
      const lastProfile = await prisma.karyawanProfile.findFirst({
        where: { 
          nik: { 
            startsWith: "SP-",
            not: null 
          } 
        },
        orderBy: { nik: "desc" }
      });

      let nextNum = 1;
      if (lastProfile?.nik) {
        const currentNum = parseInt(lastProfile.nik.replace("SP-", ""));
        if (!isNaN(currentNum)) nextNum = currentNum + 1;
      }
      nik = `SP-${nextNum.toString().padStart(5, "0")}`;
    }

    const formattedData = {
      ...data,
      gajiPokok: parseFloat(data.gajiPokok || 0),
      tunjangan: parseFloat(data.tunjangan || 0),
      feeClosing: parseFloat(data.feeClosing || 0),
      feeLead: parseFloat(data.feeLead || 0),
      bonusTarget: parseInt(data.bonusTarget || 0),
      bonusNominal: parseFloat(data.bonusNominal || 0),
    };

    const profile = await prisma.karyawanProfile.upsert({
      where: { userId },
      update: { ...formattedData, nik },
      create: { ...formattedData, userId, nik }
    });

    return NextResponse.json(profile);
  } catch (error: any) {
    console.error("Error saving karyawan profile:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
