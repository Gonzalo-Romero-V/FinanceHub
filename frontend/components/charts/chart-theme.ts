import type { CSSProperties } from "react";

/**
 * Tema visual compartido por los widgets de Recharts.
 *
 * Centralizado para que un único cambio (colores, sombras, padding del
 * tooltip, etc.) se propague a todos los charts.
 */

export const chartTooltipStyle: CSSProperties = {
  borderRadius: "12px",
  border: "1px solid var(--border)",
  backgroundColor: "var(--popover)",
  color: "var(--popover-foreground)",
  boxShadow: "0 8px 20px -8px rgba(0, 0, 0, 0.18)",
  padding: "8px 12px",
};

export const chartAxisTick = {
  fill: "var(--muted-foreground)",
} as const;

export const chartGridStroke = "var(--border)";

/** Paleta categórica para series múltiples (una cuenta = un color). */
export const chartCategoricalColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
] as const;
