import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { oldPassword, newPassword } = body;

    if (!oldPassword || !newPassword) {
      return NextResponse.json({ error: "Password lama dan baru wajib diisi" }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });

    // Verifikasi password lama
    const isValid = await bcrypt.compare(oldPassword, user.password);
    if (!isValid) {
      return NextResponse.json({ error: "Password lama salah" }, { status: 400 });
    }

    // Hash password baru
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update ke database
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword }
    });

    return NextResponse.json({ message: "Password berhasil diperbarui" });
  } catch (error) {
    console.error("CHANGE_PASSWORD_ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
