import Providers from "@/components/Providers";
import SiswaPortalLayout from "@/components/siswa/SiswaPortalLayout";

export default function SiswaRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <SiswaPortalLayout>
        {children}
      </SiswaPortalLayout>
    </Providers>
  );
}
