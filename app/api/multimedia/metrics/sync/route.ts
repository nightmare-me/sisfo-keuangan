import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) return NextResponse.json({ error: "URL diperlukan" }, { status: 400 });

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
      }
    });
    
    if (!response.ok) throw new Error("Gagal mengakses URL");
    
    const html = await response.text();
    
    // Logika Scraping TikTok
    if (url.includes("tiktok.com")) {
      const followerMatch = html.match(/\"followerCount\":(\d+)/);
      const heartMatch = html.match(/\"heartCount\":(\d+)/);
      const followingMatch = html.match(/\"followingCount\":(\d+)/);
      
      return NextResponse.json({
        platform: "TIKTOK",
        followers: followerMatch ? parseInt(followerMatch[1]) : 0,
        likes: heartMatch ? parseInt(heartMatch[1]) : 0,
        following: followingMatch ? parseInt(followingMatch[1]) : 0,
      });
    }
    
    // Logika Scraping YouTube (Simple metadata)
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      // YouTube is harder with just fetch, usually needs API, but let's try basic meta
      const subMatch = html.match(/\"subscriberCountText\":\{\"accessibility\":\{\"accessibilityData\":\{\"label\":\"([\d\.,MK]+) subscribers\"/);
      return NextResponse.json({
        platform: "YOUTUBE",
        followers: 0, // Placeholder for YT logic
        message: "Scraping YouTube butuh penanganan khusus atau API Key"
      });
    }

    return NextResponse.json({ error: "Platform tidak didukung untuk sinkronisasi otomatis" }, { status: 400 });

  } catch (error: any) {
    return NextResponse.json({ error: "Gagal menarik data: " + error.message }, { status: 500 });
  }
}
