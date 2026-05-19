import { HeaderPublic } from "@/components/layout/header-public";
import { Footer } from "@/components/layout/footer";

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen flex flex-col">
      <HeaderPublic />
      <main className="flex-1 flex flex-col">{children}</main>
      <Footer />
    </div>
  );
}
