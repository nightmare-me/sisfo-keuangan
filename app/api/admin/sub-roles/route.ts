import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// GET /api/admin/sub-roles - List all sub-roles
export async function GET() {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.roleSlug?.toLowerCase() || (session?.user as any)?.role?.toLowerCase();
  if (userRole !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const subRoles = await prisma.subRole.findMany({
      include: {
        role: true,
        permissions: true,
        _count: { select: { users: true } }
      }
    });
    return NextResponse.json(subRoles);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/admin/sub-roles - Create new sub-role
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.roleSlug?.toLowerCase() || (session?.user as any)?.role?.toLowerCase();
  if (userRole !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, roleId, permissionIds, description } = body;

    const subRole = await prisma.subRole.create({
      data: {
        name,
        roleId,
        description,
        permissions: {
          connect: (permissionIds || []).map((id: string) => ({ id }))
        }
      }
    });

    return NextResponse.json(subRole);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/admin/sub-roles - Update sub-role
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.roleSlug?.toLowerCase() || (session?.user as any)?.role?.toLowerCase();
  if (userRole !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, name, roleId, permissionIds, description } = body;

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    // Update with nested permissions sync
    const subRole = await prisma.subRole.update({
      where: { id },
      data: {
        name,
        roleId,
        description,
        permissions: {
          set: (permissionIds || []).map((id: string) => ({ id }))
        }
      }
    });

    return NextResponse.json(subRole);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/admin/sub-roles - Delete sub-role
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.roleSlug?.toLowerCase() || (session?.user as any)?.role?.toLowerCase();
  if (userRole !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await prisma.subRole.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
