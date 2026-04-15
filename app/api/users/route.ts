import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET(request: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;

  const { searchParams } = new URL(request.url);
  const filterRole = searchParams.get("role");

  // Non-admin: hanya boleh query role tertentu (untuk dropdown CS di pemasukan dll)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(["ADMIN", "AKADEMIK"].includes(role))) {
    // CS/FINANCE/PENGAJAR boleh GET dengan filter role
    if (filterRole && session) {
      const users = await prisma.user.findMany({
        where: { role: filterRole as any, aktif: true },
        select: { id: true, name: true, email: true, role: true },
        orderBy: { name: "asc" },
      });
      return NextResponse.json(users);
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ADMIN: semua user; AKADEMIK: hanya PENGAJAR
  const where: any = role === "AKADEMIK" ? { role: "PENGAJAR" } : (filterRole ? { role: filterRole as any } : {});

  const users = await prisma.user.findMany({
    where,
    select: { id: true, name: true, email: true, role: true, aktif: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const sessionRole = (session?.user as any)?.role;
  if (!session || !([ "ADMIN", "AKADEMIK"].includes(sessionRole))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Bulk create: body adalah array
  if (Array.isArray(body)) {
    const results = { success: 0, failed: 0, errors: [] as string[] };
    for (const item of body) {
      const { name, email, password, role } = item;
      // AKADEMIK hanya boleh buat PENGAJAR
      if (sessionRole === "AKADEMIK" && role !== "PENGAJAR") {
        results.failed++; results.errors.push(`${email}: AKADEMIK hanya bisa tambah PENGAJAR`); continue;
      }
      if (!name || !email || !password) {
        results.failed++; results.errors.push(`${email || name}: data tidak lengkap`); continue;
      }
      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists) {
        results.failed++; results.errors.push(`${email}: email sudah terdaftar`); continue;
      }
      try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.user.create({ data: { name, email, password: hashedPassword, role: role ?? "CS" } });
        results.success++;
      } catch {
        results.failed++; results.errors.push(`${email}: gagal disimpan`);
      }
    }
    return NextResponse.json(results, { status: 201 });
  }

  // Single create
  const { name, email, password, role } = body;
  // AKADEMIK hanya boleh buat PENGAJAR
  if (sessionRole === "AKADEMIK" && role !== "PENGAJAR") {
    return NextResponse.json({ error: "Anda hanya bisa menambahkan user dengan role PENGAJAR" }, { status: 403 });
  }
  if (!name || !email || !password) {
    return NextResponse.json({ error: "Semua field diperlukan" }, { status: 400 });
  }
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 400 });

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, password: hashedPassword, role: role ?? "CS" },
    select: { id: true, name: true, email: true, role: true, aktif: true, createdAt: true },
  });
  return NextResponse.json(user, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { id, name, email, role, aktif, password } = body;

  const updateData: any = { name, email, role, aktif };
  if (password) {
    updateData.password = await bcrypt.hash(password, 12);
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, aktif: true },
  });

  return NextResponse.json(user);
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });

  // Soft delete — nonaktifkan saja
  await prisma.user.update({ where: { id }, data: { aktif: false } });
  return NextResponse.json({ success: true });
}
