"use client";

import { useOnboarding } from "@/lib/onboarding/context";
import { WelcomeCarousel } from "@/components/onboarding/welcome-carousel";

/**
 * Muestra el carrusel de bienvenida una sola vez (primer login) por encima
 * de lo que sea que esté renderizando el layout autenticado.
 */
export function OnboardingRoot({ children }: { children: React.ReactNode }) {
  const { loaded, isSeen } = useOnboarding();
  const showCarousel = loaded && !isSeen("welcome_carousel");

  return (
    <>
      {children}
      <WelcomeCarousel open={showCarousel} onClose={() => {}} />
    </>
  );
}
