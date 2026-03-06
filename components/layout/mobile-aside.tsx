"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";

export function MobileAside() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Hamburger button (solo mobile) */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden inline-flex items-center justify-center rounded-md p-2 hover:bg-muted"
        aria-label="Abrir menú"
      >
        <span className="text-xl">☰</span>
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Aside */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-64
          bg-background border-r
          transform transition-transform duration-300
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b">
          <Logo size="h3" />
          <button
            onClick={() => setOpen(false)}
            className="text-xl"
            aria-label="Cerrar menú"
          >
            ×
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-2 p-4">
          <Button variant="ghost" asChild onClick={() => setOpen(false)}>
            <Link href="/">Home</Link>
          </Button>

          <Button variant="ghost" asChild onClick={() => setOpen(false)}>
            <Link href="/tutorial">Tutorial</Link>
          </Button>

          <Button variant="ghost" asChild onClick={() => setOpen(false)}>
            <Link href="/about">About Us</Link>
          </Button>

          <Button variant="ghost" asChild onClick={() => setOpen(false)}>
            <Link href="/login">Login</Link>
          </Button>
        </nav>
      </aside>
    </>
  );
}
