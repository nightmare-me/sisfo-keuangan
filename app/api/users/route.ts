import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { recordLog } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const sessionRoleSlug = (session?.user as any)?.role;

    const { searchParams } = new URL(request.url);
    const filterRoleSlug = searchParams.get("role");
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "50");

    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const hasUserManage = (session.user as any).permissions?.includes('user:manage');
    const isAdmin = (session.user as any).role?.toUpperCase() === 'ADMIN';

    if (!hasUserManage && !isAdmin) {
      if (filterRoleSlug) {
        const users = await prisma.user.findMany({
          where: { role: { slug: filterRoleSlug.toLowerCase() }, aktif: true },
          include: { role: true, karyawanProfile: true },
          orderBy: { name: "asc" },
        });
        const formatted = users.map((u: any) => ({
          ...u,
          role: u.role?.slug?.toUpperCase() || "USER",
          roleName: u.role?.name || "No Role"
        }));
        return NextResponse.json(formatted);
      }
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const where: any = {};
    if (filterRoleSlug) where.role = { slug: filterRoleSlug.toLowerCase() };
    if (status === "aktif") where.aktif = true;
    if (status === "nonaktif") where.aktif = false;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { namaPanggilan: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: { role: true, karyawanProfile: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where })
    ]);
    
    const formattedUsers = users.map((u: any) => ({
      ...u,
      role: u.role?.slug?.toUpperCase() || "USER",
      roleName: u.role?.name || "No Role"
    }));

    return NextResponse.json({
      data: formattedUsers,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error: any) {
    console.error("USERS_GET_ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const sessionRoleSlug = (session?.user as any)?.roleSlug || (session?.user as any)?.role?.toLowerCase();
  const isPrivileged = sessionRoleSlug === 'admin' || (session?.user as any).permissions?.includes('user:manage');

  if (!session || !isPrivileged) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Bulk create
  if (Array.isArray(body)) {
    const results = { success: 0, failed: 0, errors: [] as string[] };
    for (const item of body) {
      const { name, email, password, roleSlug, teamType } = item;
      
      if (!name || !email || !password || !roleSlug) {
        results.failed++; results.errors.push(`${email || name}: data tidak lengkap (nama, email, password, dan role wajib diisi)`); continue;
      }

      // Role Lookup yang lebih fleksibel (bisa Slug atau Nama)
      let roleObj = await prisma.role.findFirst({ 
        where: { 
          OR: [
            { slug: roleSlug.toLowerCase() },
            { name: { equals: roleSlug, mode: 'insensitive' } }
          ]
        } 
      });

      if (!roleObj) {
        results.failed++; results.errors.push(`${email}: role '${roleSlug}' tidak ditemukan`); continue;
      }

      const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      if (exists) {
        results.failed++; results.errors.push(`${email}: email sudah terdaftar`); continue;
      }

      try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Buat User sekaligus KaryawanProfile-nya
        await prisma.user.create({ 
          data: { 
            name, 
            email: email.toLowerCase(), 
            password: hashedPassword, 
            roleId: roleObj.id, 
            namaPanggilan: item.nama_panggilan || item.namaPanggilan || null,
            noHp: String(item.no_hp || item.noHp || ""),
            teamType: Array.isArray(teamType) ? teamType : (teamType ? [teamType] : []),
            karyawanProfile: {
              create: {
                nip: item.nip ? String(item.nip) : null,
                nik: item.nik ? String(item.nik) : null,
                posisi: item.posisi || null,
                alamat: item.alamat || null,
                bankName: item.bank_name || item.bankName || null,
                rekeningNomor: item.rekening_nomor ? String(item.rekening_nomor) : null,
                rekeningNama: item.rekening_nama || item.rekeningNama || null,
                gajiPokok: parseFloat(item.gaji_pokok || item.gajiPokok || 0),
                tunjangan: parseFloat(item.tunjangan || 0),
                feeClosing: parseFloat(item.fee_closing || item.feeClosing || 0),
                feeLead: parseFloat(item.fee_lead || item.feeLead || 0),
                bonusTarget: parseInt(item.bonus_target || item.bonusTarget || 0),
                bonusNominal: parseFloat(item.bonus_nominal || item.bonusNominal || 0),
                keterangan: item.keterangan || "Imported via CSV"
              }
            }
          } 
        });
        
        results.success++;
        await recordLog((session.user as any).id, "Import User (Bulk)", name, `Role: ${roleObj.name}`);
      } catch (err: any) {
        results.failed++; results.errors.push(`${email}: gagal disimpan (${err.message})`);
      }
    }
    return NextResponse.json(results, { status: 201 });
  }

  // Single create
  const { name, namaPanggilan, noHp, email, password, roleId, teamType, shiftStart, shiftEnd, isLeadActive } = body;
  if (!name || !email || !password || !roleId) {
    return NextResponse.json({ error: "Semua field diperlukan" }, { status: 400 });
  }
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 400 });

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { 
      name, namaPanggilan, noHp, email, password: hashedPassword, roleId, 
      teamType: Array.isArray(teamType) ? teamType : (teamType ? [teamType] : []),
      shiftStart: shiftStart || "08:00",
      shiftEnd: shiftEnd || "16:00",
      isLeadActive: isLeadActive ?? true
    },
    include: { role: true }
  });

  await recordLog((session.user as any).id, "Tambah User", name, `Role: ${user.role?.name}`);

  return NextResponse.json(user, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  const isPrivileged = (session?.user as any)?.role?.toUpperCase() === 'ADMIN' || (session?.user as any).permissions?.includes('user:manage');

  if (!session || !isPrivileged) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { id, name, namaPanggilan, noHp, email, roleId, teamType, aktif, password, shiftStart, shiftEnd, isLeadActive } = body;

  const updateData: any = { name, namaPanggilan, noHp, email, aktif };
  if (roleId) updateData.roleId = roleId;
  if (teamType !== undefined) {
    updateData.teamType = Array.isArray(teamType) ? teamType : (teamType ? [teamType] : []);
  }
  if (shiftStart !== undefined) updateData.shiftStart = shiftStart;
  if (shiftEnd !== undefined) updateData.shiftEnd = shiftEnd;
  if (isLeadActive !== undefined) updateData.isLeadActive = isLeadActive;
  if (password) {
    updateData.password = await bcrypt.hash(password, 12);
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    include: { role: true }
  });

  await recordLog((session.user as any).id, "Edit User", user.name, `Role: ${user.role?.name}`);

  return NextResponse.json(user);
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role?.toUpperCase() !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });

  const user = await prisma.user.update({ where: { id }, data: { aktif: false } });
  
  await recordLog((session.user as any).id, "Nonaktifkan User", user.name, "User dinonaktifkan via tombol hapus");

  return NextResponse.json({ success: true });
}
