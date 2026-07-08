/**
 * Claves de onboarding (coach marks) agrupadas por ruta. Usado por el ícono
 * de ayuda del header/aside para saber qué reiniciar cuando el usuario lo
 * toca estando en una página determinada — reinicia solo lo de esa página,
 * no todo el recorrido (eso vive en Perfil → "Reiniciar recorrido").
 */
export const PAGE_ONBOARDING_KEYS: Record<string, string[]> = {
  "/cuentas": ["cuentas_activos", "balance_general", "pasivos"],
  "/movimientos": ["tipos_movimiento", "conceptos"],
  "/presupuestos": ["presupuestos"],
  "/dashboard": ["llm_dashboard"],
};

/** Toda clave de onboarding conocida (incluye el carrusel), para el reset total. */
export const ALL_ONBOARDING_KEYS: string[] = [
  "welcome_carousel",
  ...Object.values(PAGE_ONBOARDING_KEYS).flat(),
];
