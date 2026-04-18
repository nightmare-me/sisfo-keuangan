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
      const permissions = await prisma.permission.findMany({
        orderBy: { name: 'asc' }
      });
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
