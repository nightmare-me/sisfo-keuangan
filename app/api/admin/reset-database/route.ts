import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    // Proteksi Super Ketat: Hanya ADMIN yang bisa reset
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.log('--- MEMULAI HARD RESET VIA API ---');

    // Urutan hapus untuk menghindari foreign key error
    await prisma.absensiSiswa.deleteMany({});
    await prisma.refund.deleteMany({});
    await prisma.pemasukan.deleteMany({});
    await prisma.marketingAd.deleteMany({});
    await prisma.sesiKelas.deleteMany({});
    await prisma.kelas.deleteMany({});
    await prisma.gajiPengajar.deleteMany({});
    await prisma.gajiStaf.deleteMany({});
    await prisma.studentProfile.deleteMany({});
    await prisma.karyawanProfile.deleteMany({});
    
    const admins = await prisma.user.findMany({
      where: {
        role: {
          slug: { in: ['admin', 'superadmin'] }
        }
      }
    });

    const adminIds = admins.map(a => a.id);
    
    const deleteUsers = await prisma.user.deleteMany({
      where: {
        id: {
          notIn: adminIds
        }
      }
    });

    console.log('--- RESET SELESAI ---');

    return NextResponse.json({ 
      success: true, 
      message: `Database berhasil direset. ${deleteUsers.count} user non-admin dihapus.`,
      remainingAdmins: admins.map(a => a.name)
    });

  } catch (error: any) {
    console.error('Reset Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
