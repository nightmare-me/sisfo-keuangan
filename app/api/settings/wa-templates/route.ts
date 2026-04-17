import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const DEFAULT_TEMPLATES = [
  { label: "Sapaan Awal", text: "Halo [nama], saya CS dari Speaking Partner. Terima kasih sudah mendaftar program [program]. Ada yang bisa kami bantu terkait jadwal atau pembayarannya?" },
  { label: "Instruksi Bayar", text: "Halo [nama], untuk melanjutkan pendaftaran program [program], silakan melakukan pembayaran ke Rekening BCA 12345678 a.n Speaking Partner. Nominal: [nominal]. Jangan lupa kirim bukti bayar ya!" },
  { label: "Follow Up 24 Jam", text: "Halo [nama], kami melihat Anda belum melakukan konfirmasi pembayaran untuk program [program]. Apakah ada kendala yang bisa kami bantu?" },
];

export async function GET() {
  try {
    let templates = await prisma.waTemplate.findMany({
      orderBy: { updatedAt: "asc" }
    });

    if (templates.length === 0) {
      // Seed default
      for (const t of DEFAULT_TEMPLATES) {
        await prisma.waTemplate.create({ data: t });
      }
      templates = await prisma.waTemplate.findMany({
        orderBy: { updatedAt: "asc" }
      });
    }

    return NextResponse.json(templates || []);
  } catch (error: any) {
    console.error("WA Templates GET Error:", error);
    return NextResponse.json({ error: "Gagal memuat template", details: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, label, text } = await request.json();
    const update = await prisma.waTemplate.update({
      where: { id },
      data: { label, text }
    });
    return NextResponse.json(update);
  } catch (error: any) {
    return NextResponse.json({ error: "Gagal memperbarui template" }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { label, text } = await request.json();
    const template = await prisma.waTemplate.create({
      data: { label, text }
    });
    return NextResponse.json(template);
  } catch (error: any) {
    return NextResponse.json({ error: "Gagal membuat template" }, { status: 400 });
  }
}
