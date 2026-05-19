"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CircleHelp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { HeaderShell } from "@/components/layout/header-shell";
import { AsideUser } from "@/components/layout/aside-user";
import { userNavLinks } from "@/components/layout/nav-links";
import { useAuth } from "@/lib/auth/context";

export function HeaderUser() {
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
    <HeaderShell
      logoHref="/dashboard"
      navLinks={userNavLinks}
      mobileAside={<AsideUser />}
      rightCluster={
        <>
          <Link
            href="/perfil"
            aria-label="Ir a mi perfil"
            className="group flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2 transition-colors hover:border-brand-1/50 hover:bg-brand-1/5"
          >
            <div className="grid h-7 w-7 place-items-center rounded-full bg-brand-1 xs font-bold text-white">
              {userInitials}
            </div>
            <div className="leading-tight">
              <p className="small font-semibold text-foreground group-hover:text-brand-1">
                {user?.name ?? "Usuario"}
              </p>
              <p className="xs text-muted-foreground">Sesión activa</p>
            </div>
          </Link>

          <Button variant="outline" className="rounded-xl" onClick={logout}>
            Cerrar sesión
          </Button>

          <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-brand-1" asChild>
            <Link href="/help" aria-label="Tutorial">
              <CircleHelp size={20} />
            </Link>
          </Button>
        </>
      }
    />
  );
}
