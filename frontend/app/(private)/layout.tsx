import { PrivateHeader } from "../../components/layout/private-header";
import { AuthGate } from "../../components/auth/auth-gate";

export default function PrivateLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthGate>
      <div className="min-h-screen bg-muted/20">
        <PrivateHeader />
        <main className="mx-auto w-full max-w-7xl px-4 py-4 md:px-6 md:py-6">{children}</main>
      </div>
    </AuthGate>
  );
}
