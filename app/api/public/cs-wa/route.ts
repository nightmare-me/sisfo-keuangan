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

    // 2. SMART FILTERING: Cek status ON/OFF & Shift di Database
    // Kita cari User yang noHp-nya ada di daftar
    const availableUsers = await prisma.user.findMany({
      where: {
        noHp: { in: numbers },
        aktif: true,
        isLeadActive: true,
      },
      select: { noHp: true, shiftStart: true, shiftEnd: true }
    });

    // Filter berdasarkan Jam Shift (WIB)
    const currentTimeStr = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(new Date());

    const readyNumbers = numbers.filter((num: string) => {
      const user = availableUsers.find(u => u.noHp === num);
      if (!user) return false; // Jika nomor tidak terdaftar di User, skip

      const start = user.shiftStart || "00:00";
      const end = user.shiftEnd || "23:59";
      
      if (start <= end) {
        return currentTimeStr >= start && currentTimeStr <= end;
      } else {
        // Shift malam (melewati tengah malam)
        return currentTimeStr >= start || currentTimeStr <= end;
      }
    });

    // Jika tidak ada yang ready, fallback ke nomor pertama di config agar tidak mati total
    const finalNumbers = readyNumbers.length > 0 ? readyNumbers : [numbers[0]];

    // 3. Ambil Index Terakhir & Hitung Index Berikutnya
    let lastIndexSetting = settings.find((s: any) => s.key === indexKey);
    let lastIndex = lastIndexSetting ? parseInt(lastIndexSetting.value) : -1;

    const nextIndex = (lastIndex + 1) % finalNumbers.length;
    const targetNumber = finalNumbers[nextIndex];

    // 4. Update Index di Database (Gunakan index global terhadap daftar asli atau simpan saja)
    // Di sini kita simpan index relatif terhadap list yang tersedia saat ini
    if (!lastIndexSetting) {
      await (prisma as any).systemSetting.create({
        data: {
          key: indexKey,
          value: String(nextIndex),
          label: `Last index for ${key}`,
          description: "Internal use"
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
