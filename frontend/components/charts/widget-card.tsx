"use client";

import { Info, X } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface WidgetCardProps {
  title: string;
  description?: string;
  /** Texto auxiliar pequeño bajo el título (opcional). */
  subtitle?: string;
  /** Color de acento para el indicador y el botón quitar. */
  accentColor?: string;
  onRemove: () => void;
  /** Configura el contenedor del cuerpo (height fijo para charts). */
  bodyClassName?: string;
  /** Span de columnas en grid responsive (table típicamente 2-3, charts 1). */
  className?: string;
  children: ReactNode;
}

/**
 * Shell visual común para todos los widgets del dashboard AI.
 */
export function WidgetCard({
  title,
  description,
  subtitle,
  accentColor,
  onRemove,
  bodyClassName,
  className,
  children,
}: WidgetCardProps) {
  return (
    <div
      className={cn(
        "group relative flex flex-col gap-3",
        "rounded-2xl border border-border bg-card text-card-foreground",
        "p-4 shadow-sm transition-shadow hover:shadow-md",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden
            className="mt-1.5 h-3 w-1 shrink-0 rounded-full"
            style={{ background: accentColor ?? "var(--brand-1)" }}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3
                className="small font-semibold text-foreground truncate"
                title={title}
              >
                {title}
              </h3>
              {description && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Ver descripción"
                    >
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 text-xs p-3">
                    <p className="leading-relaxed">{description}</p>
                  </PopoverContent>
                </Popover>
              )}
            </div>
            {subtitle && (
              <p className="xs text-muted-foreground truncate" title={subtitle}>
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onRemove}
          aria-label="Quitar widget"
          className={cn(
            "shrink-0 rounded-lg p-1.5",
            "text-muted-foreground hover:text-destructive hover:bg-destructive/10",
            "opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity",
          )}
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className={cn("relative w-full", bodyClassName)}>{children}</div>
    </div>
  );
}
