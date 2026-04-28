import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/**
 * POST /api/roles/seed-spv
 * Seed 3 role SPV baru ke database.
 * Hanya bisa dijalankan oleh ADMIN.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  const isAdmin = (session?.user as any)?.role === "ADMIN";
  if (!session || !isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const newRoles = [
    {
      name: "SPV CS",
      slug: "spv_cs",
      description: "Supervisor Customer Service — memantau performa dan omset seluruh tim CS",
    },
    {
      name: "SPV ADV",
      slug: "spv_adv",
      description: "Supervisor Advertiser — memantau performa iklan tim + bisa input iklan sendiri",
    },
    {
      name: "SPV Multimedia",
      slug: "spv_multimedia",
      description: "Supervisor Multimedia — memantau performa Talent Live dan tim multimedia",
    },
  ];

  const results = [];
  for (const role of newRoles) {
    const existing = await prisma.role.findUnique({ where: { slug: role.slug } });
    if (existing) {
      results.push({ slug: role.slug, status: "skipped (already exists)" });
    } else {
      const created = await prisma.role.create({ data: role });
      results.push({ slug: role.slug, status: "created", id: created.id });
    }
  }

  return NextResponse.json({ success: true, results });
}
