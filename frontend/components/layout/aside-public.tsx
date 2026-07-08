"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { AsideShell } from "@/components/layout/aside-shell";
import { publicNavLinks } from "@/components/layout/nav-links";
import { useAuth } from "@/lib/auth/context";

export function AsidePublic() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  return (
    <AsideShell
      navLinks={publicNavLinks}
      hiddenFrom="md"
      triggerLabel="Abrir menú público"
      bottomCluster={
        user ? (
          <Button
            variant="outline"
            className="h-10 justify-start gap-2 border-destructive px-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={logout}
          >
            Cerrar sesión
          </Button>
        ) : pathname === "/login" ? null : (
          <Button asChild className="h-10 justify-center gap-2 bg-brand-1 hover:bg-brand-1/90 text-white">
            <Link href="/login">Acceder</Link>
          </Button>
        )
      }
    />
  );
}
