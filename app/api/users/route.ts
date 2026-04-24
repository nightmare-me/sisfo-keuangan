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

    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Pengecekan akses: Hanya admin atau role dengan permission user:manage yang boleh lihat semua
    const hasUserManage = (session.user as any).permissions?.includes('user:manage');

    if (!hasUserManage && sessionRoleSlug?.toLowerCase() !== 'admin') {
      // Non-privileged: hanya boleh cari user tertentu (biasanya untuk filter CS)
      if (filterRoleSlug) {
        const users = await prisma.user.findMany({
          where: { role: { slug: filterRoleSlug.toLowerCase() }, aktif: true },
          include: { role: true },
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

    // Admin/Privileged: semua user (atau filter role)
    const where: any = filterRoleSlug ? { role: { slug: filterRoleSlug.toLowerCase() } } : {};

    const users = await prisma.user.findMany({
      where,
      include: { role: true },
      orderBy: { createdAt: "desc" },
    });
    
    // Map output agar match format lama tapi dengan data role baru
    const formattedUsers = users.map((u: any) => ({
      ...u,
      role: u.role?.slug?.toUpperCase() || "USER",
      roleName: u.role?.name || "No Role"
    }));

    return NextResponse.json(formattedUsers);
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

      const roleObj = await prisma.role.findUnique({ where: { slug: roleSlug.toLowerCase() } });
      if (!roleObj) {
        results.failed++; results.errors.push(`${email}: role '${roleSlug}' tidak ditemukan di database`); continue;
      }

      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists) {
        results.failed++; results.errors.push(`${email}: email sudah terdaftar`); continue;
      }

      try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.user.create({ 
          data: { 
            name, email, password: hashedPassword, 
            roleId: roleObj.id, 
            namaPanggilan: item.nama_panggilan || item.namaPanggilan || null,
            noHp: item.no_hp || item.noHp || null,
            teamType: Array.isArray(teamType) ? teamType : (teamType ? [teamType] : [])
          } 
        });
        results.success++;
        await recordLog((session.user as any).id, "Tambah User (Bulk)", name, `Role: ${roleObj.name}`);
      } catch {
        results.failed++; results.errors.push(`${email}: gagal disimpan`);
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
