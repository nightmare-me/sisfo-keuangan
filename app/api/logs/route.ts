import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const logs = await prisma.auditLog.findMany({
      include: {
        user: {
          include: { role: true }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    });

    const formatted = logs.map((l: any) => ({
      ...l,
      user: {
        ...l.user,
        role: l.user.role?.slug?.toUpperCase() || "USER"
      }
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const all = searchParams.get("all");

  if (all === "true") {
    await prisma.auditLog.deleteMany({});
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Command not found" }, { status: 404 });
}
