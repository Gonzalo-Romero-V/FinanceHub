"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { AsideShell } from "@/components/layout/aside-shell";
import { userNavLinks, userSecondaryLinks } from "@/components/layout/nav-links";
import { useAuth } from "@/lib/auth/context";

export function AsideUser() {
  const { user, logout } = useAuth();

  return (
    <AsideShell
      navLinks={userNavLinks}
      hiddenFrom="lg"
      triggerLabel="Abrir menú de usuario"
      topCluster={
        <div className="rounded-xl border border-border bg-muted/40 p-3">
          <p className="small font-semibold text-foreground">{user?.name ?? "Usuario"}</p>
          <p className="xs text-muted-foreground">Cuenta autenticada</p>
        </div>
      }
      bottomCluster={
        <>
          {userSecondaryLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.href}
                variant="ghost"
                className="h-10 justify-start gap-2 px-3 text-muted-foreground hover:text-brand-1"
                asChild
              >
                <Link href={item.href}>
                  <Icon size={16} />
                  <span>{item.label}</span>
                </Link>
              </Button>
            );
          })}
          <Button
            variant="outline"
            className="h-10 justify-start gap-2 border-destructive px-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={logout}
          >
            Cerrar sesión
          </Button>
        </>
      }
    />
  );
}
