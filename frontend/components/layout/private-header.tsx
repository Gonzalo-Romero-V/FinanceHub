"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ReceiptText, WalletMinimal, BookOpen, CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";
import { useAuth } from "@/app/context/AuthContext";
import { cn } from "@/lib/utils";

import { MobileAsidePrivate } from "./mobile-aside-private";

export const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/movimientos",
    label: "Movimientos",
    icon: ReceiptText,
  },
  {
    href: "/cuentas",
    label: "Cuentas",
    icon: WalletMinimal,
  },
  {
    href: "/conceptos",
    label: "Conceptos",
    icon: BookOpen,
  }
];

function PrivateNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Button
            key={item.href}
            variant={isActive ? "secondary" : "ghost"}
            className="h-10 rounded-xl px-3"
            asChild
          >
            <Link href={item.href}>
              <Icon size={16} />
              <span>{item.label}</span>
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}

export function PrivateHeader() {
  const { user, logout } = useAuth();

  const userInitials = useMemo(() => {
    if (!user?.name) return "US";
    return user.name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }, [user?.name]);

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 md:px-6">
        <div className="flex items-center gap-3">
          <MobileAsidePrivate navItems={navItems} user={user} logout={logout} />

          <Link href="/dashboard" className="inline-flex items-center">
            <Logo size="h3" className="tracking-tight" />
          </Link>

          <div className="hidden lg:block">
            <PrivateNav />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2 lg:flex">
            <div className="grid h-7 w-7 place-items-center rounded-full bg-brand-1 text-xs font-bold text-white">
              {userInitials}
            </div>
            <div className="leading-tight">
              <p className="small font-semibold text-foreground">{user?.name ?? "Usuario"}</p>
              <p className="xs text-muted-foreground">Sesion activa</p>
            </div>
          </div>

          <Button variant="outline" className="hidden lg:inline-flex rounded-xl" onClick={logout}>
            Cerrar sesion
          </Button>

          <Button variant="ghost" size="icon" className="hidden lg:inline-flex rounded-full text-muted-foreground hover:text-brand-1" asChild>
            <Link href="/help">
              <CircleHelp size={20} />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
