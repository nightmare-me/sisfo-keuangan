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
    const isSiswa = (session.user as any).roleSlug === "siswa";

    // 1. Ambil data sesuai tipe user
    let dbUser: any = null;
    if (isSiswa) {
      dbUser = await prisma.siswa.findUnique({ where: { id: userId } });
    } else {
      dbUser = await prisma.user.findUnique({ where: { id: userId } });
    }

    if (!dbUser) return NextResponse.json({ error: "Data pengguna tidak ditemukan" }, { status: 404 });

    // 2. Verifikasi password lama
    // Catatan: Jika password siswa null (baru diimpor), verifikasi dilewati atau dianggap benar jika input kosong? 
    // Tapi biasanya password default sudah di-hash saat convert.
    const isValid = await bcrypt.compare(oldPassword, dbUser.password);
    if (!isValid) {
      return NextResponse.json({ error: "Password lama salah" }, { status: 400 });
    }

    // 3. Hash password baru
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // 4. Update ke database
    if (isSiswa) {
      await prisma.siswa.update({
        where: { id: userId },
        data: { password: hashedNewPassword }
      });
    } else {
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedNewPassword }
      });
    }

    return NextResponse.json({ message: "Password berhasil diperbarui" });
  } catch (error) {
    console.error("CHANGE_PASSWORD_ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
