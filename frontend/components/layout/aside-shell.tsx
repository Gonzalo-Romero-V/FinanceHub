"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";
import type { NavLink } from "@/components/layout/nav-links";

interface AsideShellProps {
  navLinks: NavLink[];
  topCluster?: ReactNode;
  bottomCluster?: ReactNode;
  hiddenFrom?: "md" | "lg";
  triggerLabel?: string;
}

export function AsideShell({
  navLinks,
  topCluster,
  bottomCluster,
  hiddenFrom = "lg",
  triggerLabel = "Abrir menú",
}: AsideShellProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Cierra el menú apenas cambia la ruta — cubre cualquier link que
  // navegue, incluidos los de topCluster/bottomCluster (ej. Perfil, Ayuda),
  // que al venir de afuera como ReactNode no tienen forma directa de tocar
  // el estado `open` de acá.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const hideClass = hiddenFrom === "md" ? "md:hidden" : "lg:hidden";

  const menuContent = (
    <>
      {open && (
        <div
          className={cn("fixed inset-0 z-[100] bg-black/40", hideClass)}
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-[100] h-full w-72 border-r border-border bg-background p-4 flex flex-col",
          hideClass,
          "transform transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="mb-6 flex items-center justify-between">
          <Logo size="h3" />
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Cerrar menú">
            <X size={18} />
          </Button>
        </div>

        {topCluster && <div className="mb-4 flex-shrink-0">{topCluster}</div>}

        <div className="flex-grow overflow-y-auto">
          <nav className="flex flex-col gap-1">
            {navLinks.map((item) => {
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

        {bottomCluster && (
          <div className="mt-auto flex flex-shrink-0 flex-col gap-2 border-t border-border pt-4">
            {bottomCluster}
          </div>
        )}
      </aside>
    </>
  );

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className={hideClass}
        onClick={() => setOpen(true)}
        aria-label={triggerLabel}
      >
        <Menu size={18} />
      </Button>

      {mounted && createPortal(menuContent, document.body)}
    </>
  );
}
