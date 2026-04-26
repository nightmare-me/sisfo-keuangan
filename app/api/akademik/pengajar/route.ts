import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "50");

    const where: any = {
      role: {
        slug: { in: ['pengajar', 'tutor'] }
      }
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          role: true,
          karyawanProfile: true
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where })
    ]);

    return NextResponse.json({ 
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { name, email, password, posisi, nik, bankName, rekeningNomor, rekeningNama } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Nama, Email, dan Password wajib diisi" }, { status: 400 });
    }

    // Cari ID untuk role PENGAJAR
    const role = await prisma.role.findFirst({
        where: { slug: { in: ['pengajar', 'tutor'] } }
    });

    if (!role) {
        return NextResponse.json({ error: "Role 'PENGAJAR' tidak ditemukan di database. Hubungi Admin." }, { status: 404 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Transaction untuk membuat User dan Profile sekaligus
    const newTeacher = await prisma.$transaction(async (tx: any) => {
        const user = await tx.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                roleId: role.id,
                aktif: true
            }
        });

        const profile = await tx.karyawanProfile.create({
            data: {
                userId: user.id,
                nik,
                posisi: posisi || "Pengajar",
                bankName,
                rekeningNomor,
                rekeningNama,
                gajiPokok: 0, // Default 0, biar Finance yang atur nanti
            }
        });

        return { ...user, karyawanProfile: profile };
    });

    return NextResponse.json(newTeacher, { status: 201 });
  } catch (err: any) {
    if (err.code === 'P2002') {
        return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 400 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
