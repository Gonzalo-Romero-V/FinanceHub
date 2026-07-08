"use client";

import { useState } from "react";
import Link from "next/link";

import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useOnboarding } from "@/lib/onboarding/context";

interface CoachMarkProps {
  /** Clave única de onboarding (ver `lib/onboarding/page-keys.ts`). */
  id: string;
  text: string;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  /** Link opcional "Más info" hacia la guía rápida. */
  guideHref?: string;
  /** Condición extra para permitir mostrarlo (ej. esperar a que se haya
   * visto otro coach mark primero, para no mostrar varios a la vez). */
  enabled?: boolean;
}

/**
 * Coach mark: aparece una sola vez (por usuario, persistido en backend) la
 * primera vez que el elemento envuelto entra en pantalla. No requiere click
 * para abrirse — se ancla automáticamente. Se descarta con "Entendido",
 * click afuera o Escape (cualquiera de los tres cuenta como "visto").
 */
export function CoachMark({
  id,
  text,
  children,
  side = "bottom",
  align = "center",
  guideHref,
  enabled = true,
}: CoachMarkProps) {
  const { isSeen, markSeen, loaded } = useOnboarding();
  const [dismissed, setDismissed] = useState(false);
  const show = loaded && enabled && !isSeen(id) && !dismissed;

  const dismiss = () => {
    setDismissed(true);
    markSeen(id);
  };

  return (
    <Popover open={show}>
      <PopoverAnchor asChild>{children}</PopoverAnchor>
      <PopoverContent
        side={side}
        align={align}
        className="w-72 space-y-3"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onEscapeKeyDown={dismiss}
        onPointerDownOutside={dismiss}
      >
        <p className="small text-foreground">{text}</p>
        <div className="flex items-center justify-between gap-2">
          {guideHref ? (
            <Link href={guideHref} className="xs text-brand-1 hover:underline">
              Más info
            </Link>
          ) : (
            <span />
          )}
          <Button size="sm" onClick={dismiss}>
            Entendido
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
