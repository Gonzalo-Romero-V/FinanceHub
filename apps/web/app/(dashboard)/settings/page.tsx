'use client';

import { ThemeToggle } from '@/components/theme/ThemeToggle';

export default function SettingsPage() {
  return (
    <div className="w-full max-w-2xl space-y-6 sm:space-y-8">
      <div className="glass-strong rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-xl">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-3 text-[var(--color-foreground)]">
          Configuración
        </h1>
        <p className="text-sm sm:text-base text-[var(--color-mutedForeground)] mb-6 sm:mb-8">
          Personaliza tu experiencia
        </p>

        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <h3 className="text-base sm:text-lg font-semibold mb-1 text-[var(--color-foreground)]">
                Tema
              </h3>
              <p className="text-xs sm:text-sm text-[var(--color-mutedForeground)]">
                Elige entre modo claro u oscuro
              </p>
            </div>
            <div className="flex-shrink-0">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
