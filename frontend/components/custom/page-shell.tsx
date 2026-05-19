import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type MaxWidth = "3xl" | "4xl" | "5xl" | "6xl" | "7xl";

interface PageShellProps {
  children: ReactNode;
  maxWidth?: MaxWidth;
  className?: string;
}

const maxWidthMap: Record<MaxWidth, string> = {
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
};

export function PageShell({ children, maxWidth = "5xl", className }: PageShellProps) {
  return (
    <section
      className={cn(
        "mx-auto w-full px-4 md:px-6 py-8 md:py-12 bg-background text-foreground",
        maxWidthMap[maxWidth],
        className,
      )}
    >
      {children}
    </section>
  );
}
