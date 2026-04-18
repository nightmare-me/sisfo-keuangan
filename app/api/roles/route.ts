import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const sessionRoleSlug = (session?.user as any)?.roleSlug;
    if (!session || sessionRoleSlug !== 'admin') {
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
    const sessionRoleSlug = (session?.user as any)?.roleSlug;
    if (!session || sessionRoleSlug !== 'admin') {
       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, slug, description, permissionIds } = body;

    const result = await prisma.role.upsert({
      where: { id: id || "new-role" },
      update: {
        name,
        slug,
        description,
        permissions: {
          set: permissionIds.map((pid: string) => ({ id: pid }))
        }
      },
      create: {
        name,
        slug,
        description,
        permissions: {
          connect: permissionIds.map((pid: string) => ({ id: pid }))
        }
      }
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "Gagal menyimpan role" }, { status: 500 });
  }
}
