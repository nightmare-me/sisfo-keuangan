import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const lead = await prisma.lead.findUnique({
      where: { id: params.id },
      include: {
        program: true,
        cs: {
          select: { name: true }
        }
      }
    });

    if (!lead) return NextResponse.json({ error: "Lead tidak ditemukan" }, { status: 404 });

    return NextResponse.json(lead);
  } catch (error: any) {
    return NextResponse.json({ error: "Gagal mengambil data invoice", details: error.message }, { status: 500 });
  }
}
