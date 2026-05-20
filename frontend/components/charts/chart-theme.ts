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
