import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/context";
import { DeepLinkListener } from "@/components/auth/deep-link-listener";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FinanceHub",
  description: "Gestiona tus cuentas, movimientos y presupuestos en un solo lugar.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`
    ${geistSans.variable}
    ${geistMono.variable}
    antialiased
    min-h-screen
    flex
    flex-col
  `}
      >
        <AuthProvider>
          <DeepLinkListener />
          {children}
          <Toaster richColors position="bottom-right" duration={4500} />
        </AuthProvider>
      </body>
    </html>
  );
}
