import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const DEFAULT_CATS = [
  "Gaji Pengajar", "Gaji Staf", "Sewa Tempat", "Utilitas", "ATK", 
  "Marketing", "Peralatan", "Pemeliharaan", "Lainnya"
];

// Helper untuk reset/isi kategori jika kosong
async function ensureCategories() {
  const count = await prisma.kategoriPengeluaran.count();
  if (count === 0) {
    for (const nama of DEFAULT_CATS) {
      await prisma.kategoriPengeluaran.upsert({
        where: { slug: nama.toLowerCase().replace(/\s+/g, '-') },
        update: {},
        create: {
          nama,
          slug: nama.toLowerCase().replace(/\s+/g, '-'),
          color: "#6366f1"
        }
      }).catch(e => console.error("SEED_ERROR:", e.message));
    }
  }
}

export async function GET() {
  try {
    await ensureCategories();
    const categories = await prisma.kategoriPengeluaran.findMany({
      orderBy: { nama: "asc" }
    });
    return NextResponse.json(categories);
  } catch (error: any) {
    console.error("CAT_GET_ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { nama, color } = await request.json();
    if (!nama) return NextResponse.json({ error: "Nama required" }, { status: 400 });

    const slug = nama.toLowerCase().replace(/\s+/g, '-');

    const category = await prisma.kategoriPengeluaran.upsert({
      where: { slug },
      update: { nama, color },
      create: { nama, slug, color: color || "#6366f1" }
    });

    return NextResponse.json(category);
  } catch (error: any) {
    console.error("CAT_POST_ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await prisma.kategoriPengeluaran.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("CAT_DEL_ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
