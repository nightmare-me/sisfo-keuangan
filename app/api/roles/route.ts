import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const user = (session?.user as any);
    const isAdmin = user?.roleSlug === 'admin' || user?.role === 'ADMIN';
    
    if (!session || !isAdmin) {
       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (type === "permissions") {
      let permissions = await prisma.permission.findMany({
        orderBy: { name: 'asc' }
      });

      // Auto-Seed Permissions if empty
      if (permissions.length === 0) {
        const modules = [
          'dashboard', 'crm', 'finance_in', 'finance_out', 'ads_spent', 'ads_performance',
          'report', 'refund', 'payroll_staff', 'siswa', 'kelas', 'program',
          'payroll_tutor', 'pengajar', 'invoice', 'inventaris', 'live_tracking',
          'user', 'settings', 'audit', 'archive', 'wa_template'
        ];
        const actions = ['view', 'edit', 'delete'];
        
        const newPerms = [];
        for (const mod of modules) {
          for (const act of actions) {
            newPerms.push({
              name: `${act.toUpperCase()} ${mod.toUpperCase()}`,
              slug: `${mod}:${act}`,
              description: `Akses untuk ${act} pada modul ${mod}`
            });
          }
        }
        await prisma.permission.createMany({ data: newPerms, skipDuplicates: true });
        
        permissions = await prisma.permission.findMany({
          orderBy: { name: 'asc' }
        });
      }

      return NextResponse.json(permissions);
    }

    const roles = await prisma.role.findMany({
      include: { permissions: true },
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(roles);

  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const user = (session?.user as any);
    const isAdmin = user?.roleSlug === 'admin' || user?.role === 'ADMIN';
    
    if (!session || !isAdmin) {
       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, slug, description, permissionIds } = body;

    let result;
    if (id) {
      // UPDATE existing role
      result = await prisma.role.update({
        where: { id },
        data: {
          name,
          slug,
          description,
          permissions: {
            set: (permissionIds || []).map((pid: string) => ({ id: pid }))
          }
        }
      });
    } else {
      // CREATE new role
      result = await prisma.role.create({
        data: {
          name,
          slug: slug || name.toLowerCase().replace(/ /g, '_'),
          description: description || "",
          permissions: {
            connect: (permissionIds || []).map((pid: string) => ({ id: pid }))
          }
        }
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "Gagal menyimpan role" }, { status: 500 });
  }
}
