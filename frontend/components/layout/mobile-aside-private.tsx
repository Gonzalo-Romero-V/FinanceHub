"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Menu, X, CircleHelp } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";

interface NavItem {
  href: string;
  label: string;
  icon: any;
}

interface MobileAsidePrivateProps {
  navItems: NavItem[];
  user: any;
  logout: () => void;
}

export function MobileAsidePrivate({ navItems, user, logout }: MobileAsidePrivateProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  const menuContent = (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[100] bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Aside Menu */}
      <aside
        className={`
          fixed top-0 left-0 z-[100] h-full w-72 border-r border-border bg-background p-4 flex flex-col lg:hidden
          transform transition-transform duration-300
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="mb-6 flex items-center justify-between">
          <Logo size="h3" />
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Cerrar menu privado">
            <X size={18} />
          </Button>
        </div>

        <div className="mb-4 flex-shrink-0 rounded-xl border border-border bg-muted/40 p-3">
          <p className="small font-semibold text-foreground">{user?.name ?? "Usuario"}</p>
          <p className="xs text-muted-foreground">Cuenta autenticada</p>
        </div>

        <div className="flex-grow overflow-y-auto">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Button
                  key={item.href}
                  variant={isActive ? "secondary" : "ghost"}
                  className="h-10 w-full justify-start rounded-xl px-3"
                  asChild
                  onClick={() => setOpen(false)}
                >
                  <Link href={item.href}>
                    <Icon size={16} className="mr-2" />
                    <span>{item.label}</span>
                  </Link>
                </Button>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto flex flex-shrink-0 flex-col gap-2 border-t border-border pt-4">
          <Button
            variant="ghost"
            className="h-10 justify-start gap-2 px-3 text-muted-foreground hover:text-brand-1"
            asChild
            onClick={() => setOpen(false)}
          >
            <Link href="/help">
              <CircleHelp size={16} />
              <span>Tutorial</span>
            </Link>
          </Button>
          <Button
            variant="outline"
            className="h-10 justify-start gap-2 border-destructive px-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => { setOpen(false); logout(); }}
          >
            <span>Cerrar sesión</span>
          </Button>
        </div>
      </aside>
    </>
  );

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setOpen(true)}
        aria-label="Abrir menu privado"
      >
        <Menu size={18} />
      </Button>

      {mounted && createPortal(menuContent, document.body)}
    </>
  );
}
