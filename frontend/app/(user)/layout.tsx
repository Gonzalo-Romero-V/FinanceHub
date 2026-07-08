import { HeaderUser } from "@/components/layout/header-user";
import { AuthGate } from "@/components/auth/auth-gate";
import { OnboardingProvider } from "@/lib/onboarding/context";
import { OnboardingRoot } from "@/components/onboarding/onboarding-root";
import { OfflineStatusBar } from "@/components/offline/offline-status-bar";

export default function UserLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthGate>
      <OnboardingProvider>
        <OnboardingRoot>
          <div className="min-h-screen bg-muted/20">
            <HeaderUser />
            <OfflineStatusBar />
            <main className="mx-auto w-full max-w-7xl px-4 py-4 md:px-6 md:py-6">{children}</main>
          </div>
        </OnboardingRoot>
      </OnboardingProvider>
    </AuthGate>
  );
}
