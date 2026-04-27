"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function PerformanceRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/ads");
  }, [router]);

  return (
    <div className="container" style={{ padding: 40, textAlign: 'center' }}>
      <p>Memindahkan Anda ke Manajemen Iklan...</p>
    </div>
  );
}
