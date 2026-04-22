import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// GET /api/admin/sub-roles - List all sub-roles
export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.roleSlug !== "admin") {
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
  if (session?.user?.roleSlug !== "admin") {
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
