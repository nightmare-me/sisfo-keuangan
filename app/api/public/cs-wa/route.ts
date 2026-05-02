import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "sales"; // default sales
    const key = type === "sales" ? "cs_sales_numbers" : "cs_numbers";
    const indexKey = `${key}_last_index`;

    // 1. Ambil Pengaturan Nomor
    const settings = await (prisma as any).systemSetting.findMany({
      where: { key: { in: [key, indexKey] } }
    });

    const numbersSetting = settings.find((s: any) => s.key === key);
    if (!numbersSetting || !numbersSetting.value) {
      return NextResponse.json({ error: "Nomor CS belum diatur" }, { status: 404 });
    }

    const numbers = numbersSetting.value.split(",").map((n: string) => n.trim());
    if (numbers.length === 0) return NextResponse.json({ error: "Daftar nomor kosong" }, { status: 404 });

    // 2. Ambil Index Terakhir
    let lastIndexSetting = settings.find((s: any) => s.key === indexKey);
    let lastIndex = lastIndexSetting ? parseInt(lastIndexSetting.value) : -1;

    // 3. Hitung Index Berikutnya (Round Robin)
    const nextIndex = (lastIndex + 1) % numbers.length;
    const targetNumber = numbers[nextIndex];

    // 4. Update Index di Database
    if (!lastIndexSetting) {
      await (prisma as any).systemSetting.create({
        data: {
          key: indexKey,
          value: String(nextIndex),
          label: `Last used index for ${key}`,
          description: "Internal use for Round Robin logic"
        }
      });
    } else {
      await (prisma as any).systemSetting.update({
        where: { id: lastIndexSetting.id },
        data: { value: String(nextIndex) }
      });
    }

    // 5. Redirect ke WhatsApp atau return JSON
    const redirect = searchParams.get("redirect") !== "false";
    const text = searchParams.get("text") || "Halo Admin, saya ingin bertanya...";
    const waUrl = `https://wa.me/${targetNumber}?text=${encodeURIComponent(text)}`;

    if (redirect) {
      return NextResponse.redirect(waUrl);
    } else {
      return NextResponse.json({ 
        success: true, 
        number: targetNumber, 
        url: waUrl,
        index: nextIndex 
      });
    }

  } catch (error: any) {
    console.error("CS_ROUND_ROBIN_ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
