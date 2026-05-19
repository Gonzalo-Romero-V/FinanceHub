"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";
import type { NavLink } from "@/components/layout/nav-links";

interface HeaderShellProps {
  logoHref: string;
  navLinks?: NavLink[];
  rightCluster?: ReactNode;
  mobileAside?: ReactNode;
  maxWidth?: "4xl" | "5xl" | "6xl" | "7xl";
  /** Breakpoint a partir del cual se muestra la nav desktop. */
  desktopBreakpoint?: "md" | "lg";
}

const maxWidthMap = {
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
} as const;

export function HeaderShell({
  logoHref,
  navLinks,
  rightCluster,
  mobileAside,
  maxWidth = "7xl",
  desktopBreakpoint = "lg",
}: HeaderShellProps) {
  const desktopShow = desktopBreakpoint === "md" ? "md:flex" : "lg:flex";
  const desktopHide = desktopBreakpoint === "md" ? "md:hidden" : "lg:hidden";

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur">
      <div className={cn("mx-auto flex h-16 w-full items-center justify-between gap-3 px-4 md:px-6", maxWidthMap[maxWidth])}>
        <div className="flex items-center gap-3">
          {mobileAside && <span className={desktopHide}>{mobileAside}</span>}

          <Link href={logoHref} className="inline-flex items-center">
            <Logo size="h3" className="tracking-tight" />
          </Link>

          {navLinks && navLinks.length > 0 && (
            <nav className={cn("hidden items-center gap-1", desktopShow)}>
              <HeaderNav navLinks={navLinks} />
            </nav>
          )}
        </div>

        {rightCluster && (
          <div className={cn("hidden items-center gap-2", desktopShow)}>
            {rightCluster}
          </div>
        )}
      </div>
    </header>
  );
}

function HeaderNav({ navLinks }: { navLinks: NavLink[] }) {
  const pathname = usePathname();

  return (
    <>
      {navLinks.map((item) => {
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
    </>
  );
}
