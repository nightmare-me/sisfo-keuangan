import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const settings = await prisma.systemSetting.findMany();
    
    // Jika cs_numbers belum ada, buatkan defaultnya
    if (!settings.find(s => s.key === "cs_numbers")) {
      const defaultCs = await prisma.systemSetting.create({
        data: {
          key: "cs_numbers",
          value: "6281234567890,6281234567891,6281234567892",
          label: "Nomor WhatsApp Customer Care",
          description: "Pisahkan dengan koma jika lebih dari satu nomor untuk Round Robin"
        }
      });
      settings.push(defaultCs);
    }

    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: "Gagal mengambil pengaturan" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, value } = body;

    const setting = await prisma.systemSetting.update({
      where: { id },
      data: { value }
    });

    return NextResponse.json(setting);
  } catch (error) {
    return NextResponse.json({ error: "Gagal memperbarui pengaturan" }, { status: 500 });
  }
}
