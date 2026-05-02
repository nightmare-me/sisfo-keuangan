import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const all = searchParams.get("all") === "true";
  const hasPemasukanOnly = searchParams.get("hasPemasukanOnly") === "true";
  const search = searchParams.get("search") || "";
  const tipe = searchParams.get("tipe") || "";
  const kategoriUsia = searchParams.get("kategoriUsia") || "";
  const page = searchParams.get("page") ? parseInt(searchParams.get("page")!) : null;
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : null;

  const where: any = all ? {} : { aktif: true };
  
  if (hasPemasukanOnly) {
    where.pemasukan = { some: {} };
  }

  if (search) {
    where.nama = { contains: search, mode: "insensitive" };
  }

  if (tipe) {
    where.tipe = tipe;
  }

  if (kategoriUsia) {
    where.kategoriUsia = kategoriUsia;
  }

  // If no pagination requested (usually for dropdowns)
  if (!page || !limit) {
    const programs = await prisma.program.findMany({
      where,
      orderBy: { nama: "asc" },
    });
    return NextResponse.json(programs);
  }

  // Paginated request (usually for the management table)
  const [data, total] = await Promise.all([
    prisma.program.findMany({
      where,
      orderBy: { nama: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.program.count({ where })
  ]);

  return NextResponse.json({ 
    data,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  });
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json();
    const { nama, deskripsi, tipe, harga, kategoriFee, durasi, feeClosing, feeClosingRO, isProfitSharing, kategoriUsia } = body;
    
    if (!nama || !harga) return NextResponse.json({ error: "Nama dan harga diperlukan" }, { status: 400 });
    
    const program = await prisma.program.create({ 
      data: { 
        nama, 
        deskripsi, 
        tipe: tipe ?? "REGULAR", 
        kategoriUsia: kategoriUsia ?? "UMUM",
        harga: Number(harga) || 0, 
        kategoriFee,
        feeClosing: Number(feeClosing) || 0,
        feeClosingRO: Number(feeClosingRO) || 0,
        isProfitSharing: !!isProfitSharing,
        durasi: durasi ?? null 
      } 
    });
    return NextResponse.json(program, { status: 201 });
  } catch (err: any) {
    console.error("POST_PROGRAM_ERR:", err);
    return NextResponse.json({ error: err.message || "Gagal menambah program" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json();
    const { id, ...data } = body;
    
    if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });

    // Format numeric values
    if (data.feeClosing !== undefined) data.feeClosing = Number(data.feeClosing) || 0;
    if (data.feeClosingRO !== undefined) data.feeClosingRO = Number(data.feeClosingRO) || 0;
    if (data.harga !== undefined) data.harga = Number(data.harga) || 0;

    const program = await prisma.program.update({ where: { id }, data });
    return NextResponse.json(program);
  } catch (err: any) {
    console.error("PUT_PROGRAM_ERR:", err);
    return NextResponse.json({ error: err.message || "Gagal update program" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const deleteAll = searchParams.get("deleteAll");

  if (deleteAll === "true") {
    // Hard delete all programs — WARNING: will fail if used in classes
    try {
      await prisma.program.deleteMany({});
      return NextResponse.json({ success: true });
    } catch (err: any) {
      return NextResponse.json({ error: "Gagal hapus: program mungkin masih digunakan di data kelas/invoice" }, { status: 400 });
    }
  }

  if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });

  // Soft delete for single item to keep history safe
  await prisma.program.update({ where: { id }, data: { aktif: false } });
  return NextResponse.json({ success: true });
}
