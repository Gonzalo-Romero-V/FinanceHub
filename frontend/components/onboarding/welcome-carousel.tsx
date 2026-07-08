"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet, Scale, Mic } from "lucide-react";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useOnboarding } from "@/lib/onboarding/context";

interface Slide {
  icon: React.ElementType;
  title: string;
  text: string;
}

const SLIDES: Slide[] = [
  {
    icon: Wallet,
    title: "Bienvenido a FinanceHub",
    text: "Organiza tus cuentas, movimientos y presupuestos en un solo lugar.",
  },
  {
    icon: Scale,
    title: "Tu Balance General, siempre actualizado",
    text: "Sumamos lo que tienes y restamos lo que debes automáticamente con cada movimiento.",
  },
  {
    icon: Mic,
    title: "Pregúntale a tu asistente",
    text: "Escribe o habla para consultar tus finanzas o registrar un movimiento.",
  },
];

const ONBOARDING_KEY = "welcome_carousel";

interface WelcomeCarouselProps {
  open: boolean;
  onClose: () => void;
}

export function WelcomeCarousel({ open, onClose }: WelcomeCarouselProps) {
  const [step, setStep] = useState(0);
  const router = useRouter();
  const { markSeen } = useOnboarding();
  const isLast = step === SLIDES.length;

  const finish = () => {
    markSeen(ONBOARDING_KEY);
    setStep(0);
    onClose();
  };

  const handleCta = () => {
    finish();
    router.push("/cuentas?crear=1");
  };

  const slide = SLIDES[step];

  return (
    <Modal open={open} onClose={finish} size="sm">
      <div className="flex flex-col items-center gap-6 py-2 text-center">
        {!isLast && slide ? (
          <>
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-1/10 text-brand-1">
              <slide.icon size={28} />
            </div>
            <div className="space-y-2">
              <h3 className="h3 text-foreground">{slide.title}</h3>
              <p className="small text-muted-foreground">{slide.text}</p>
            </div>
          </>
        ) : (
          <>
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-1/10 text-brand-1">
              <Wallet size={28} />
            </div>
            <div className="space-y-2">
              <h3 className="h3 text-foreground">Empecemos</h3>
              <p className="small text-muted-foreground">Lo primero: registra tu primera cuenta.</p>
            </div>
          </>
        )}

        <div className="flex items-center gap-1.5">
          {[...SLIDES, null].map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === step ? "w-5 bg-brand-1" : "w-1.5 bg-muted",
              )}
            />
          ))}
        </div>

        <div className="flex w-full items-center justify-between gap-3 pt-2">
          <Button variant="ghost" onClick={finish} className="text-muted-foreground">
            Saltar
          </Button>
          {isLast ? (
            <Button onClick={handleCta} className="bg-brand-1 hover:bg-brand-1/90 text-white">
              Registrar mi primera cuenta
            </Button>
          ) : (
            <Button onClick={() => setStep((s) => s + 1)} className="bg-brand-1 hover:bg-brand-1/90 text-white">
              Siguiente
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
