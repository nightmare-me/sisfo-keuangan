import type { Metadata } from "next";
import { Lexend, Manrope } from "next/font/google";
import "./globals.css";

const lexend = Lexend({ 
  subsets: ["latin"],
  variable: "--font-lexend",
  weight: ["400", "500", "600", "700", "800"],
});

const manrope = Manrope({ 
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700", "800"],
});

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
    <html lang="id" className={`${lexend.variable} ${manrope.variable}`}>
      <body>{children}</body>
    </html>
  );
}
