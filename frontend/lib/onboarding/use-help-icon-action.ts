"use client";

import { usePathname, useRouter } from "next/navigation";

import { useOnboarding } from "@/lib/onboarding/context";
import { PAGE_ONBOARDING_KEYS } from "@/lib/onboarding/page-keys";
import { notifyInfo } from "@/lib/ui/notify";

/**
 * Acción del ícono de ayuda (header/aside): si la página actual tiene coach
 * marks propias, las reinicia y las vuelve a mostrar ahí mismo. Si la
 * página no tiene ninguna (ej. Perfil, Conceptos), navega a la guía rápida.
 */
export function useHelpIconAction() {
  const pathname = usePathname();
  const router = useRouter();
  const { resetKeys } = useOnboarding();

  return async () => {
    const keys = PAGE_ONBOARDING_KEYS[pathname];
    if (keys && keys.length > 0) {
      await resetKeys(keys);
      notifyInfo("Te mostramos de nuevo la guía de esta página.");
    } else {
      router.push("/help");
    }
  };
}
