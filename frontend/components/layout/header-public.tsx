"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { HeaderShell } from "@/components/layout/header-shell";
import { AsidePublic } from "@/components/layout/aside-public";
import { publicNavLinks } from "@/components/layout/nav-links";
import { useAuth } from "@/lib/auth/context";

export function HeaderPublic() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  return (
    <HeaderShell
      logoHref="/"
      navLinks={publicNavLinks}
      maxWidth="4xl"
      desktopBreakpoint="md"
      mobileAside={<AsidePublic />}
      rightCluster={
        user ? (
          <Button variant="link" onClick={logout} className="text-muted-foreground hover:text-destructive">
            Cerrar sesión
          </Button>
        ) : pathname === "/login" ? null : (
          <Button asChild className="bg-brand-1 text-white hover:bg-brand-1/90 rounded-lg shadow-md">
            <Link href="/login">Acceder</Link>
          </Button>
        )
      }
    />
  );
}
