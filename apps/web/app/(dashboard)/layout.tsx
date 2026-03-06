import { Header } from '@/components/layout/Header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--color-background)] overflow-x-hidden">
      <Header />
      <main className="container mx-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 max-w-full overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
