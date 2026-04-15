import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Hanya ADMIN
  const role = (session.user as any)?.role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Hanya Admin yang bisa menghapus semua data" }, { status: 403 });
  }

  // Hapus invoice dulu (foreign key), lalu pemasukan
  await prisma.invoice.deleteMany({});
  const result = await prisma.pemasukan.deleteMany({});

  return NextResponse.json({ success: true, deleted: result.count });
}
