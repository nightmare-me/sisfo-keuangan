import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Speaking Partner by Kampung Inggris | Sistem Informasi Keuangan",
  description: "Sistem Informasi Keuangan Speaking Partner by Kampung Inggris - Manajemen keuangan, siswa, dan operasional lembaga kursus bahasa.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
