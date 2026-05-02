import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    if (!(prisma as any).systemSetting) {
      return NextResponse.json({ error: "Sistem belum siap (Prisma Client Error). Silakan restart server." }, { status: 500 });
    }

    const settings = await (prisma as any).systemSetting.findMany();
    
    // Jika cs_numbers belum ada, buatkan defaultnya
    const hasCs = settings.find((s: any) => s.key === "cs_numbers");
    if (!hasCs) {
      const defaultCs = await (prisma as any).systemSetting.create({
        data: {
          key: "cs_numbers",
          value: "6281234567890",
          label: "Nomor WhatsApp Customer Care",
          description: "Pisahkan dengan koma jika lebih dari satu nomor untuk Round Robin (Bantuan Siswa)"
        }
      });
      settings.push(defaultCs);
    }

    // Jika cs_sales_numbers belum ada, buatkan defaultnya
    const hasSales = settings.find((s: any) => s.key === "cs_sales_numbers");
    if (!hasSales) {
      const salesCs = await (prisma as any).systemSetting.create({
        data: {
          key: "cs_sales_numbers",
          value: "6281234567890,6281234567891",
          label: "Nomor WhatsApp CS (Sales/Leads)",
          description: "Pisahkan dengan koma. Nomor ini akan digilir (Round Robin) untuk calon siswa baru."
        }
      });
      settings.push(salesCs);
    }

    // Jika whatsapp_finance belum ada, buatkan defaultnya
    const hasFinance = settings.find((s: any) => s.key === "whatsapp_finance");
    if (!hasFinance) {
      const financeSetting = await (prisma as any).systemSetting.create({
        data: {
          key: "whatsapp_finance",
          value: "6287762630406",
          label: "Nomor WhatsApp Admin Finance",
          description: "Nomor WhatsApp untuk pengajuan slip gaji dan pertanyaan finansial pengajar."
        }
      });
      settings.push(financeSetting);
    }

    return NextResponse.json(settings);
  } catch (error: any) {
    console.error("GET_SYSTEM_SETTINGS_ERROR:", error);
    return NextResponse.json({ error: "Gagal mengambil pengaturan", details: error.message }, { status: 500 });
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

    if (!(prisma as any).systemSetting) {
      return NextResponse.json({ error: "Prisma Client Error" }, { status: 500 });
    }

    const setting = await (prisma as any).systemSetting.update({
      where: { id },
      data: { value }
    });

    return NextResponse.json(setting);
  } catch (error: any) {
    console.error("PUT_SYSTEM_SETTINGS_ERROR:", error);
    return NextResponse.json({ error: "Gagal memperbarui pengaturan", details: error.message }, { status: 500 });
  }
}
