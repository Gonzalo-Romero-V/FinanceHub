export type WidgetType = "bar" | "line" | "pie" | "table" | "kpi";

/**
 * Cómo formatear los valores numéricos del widget.
 * - `currency`: con símbolo monetario y separadores (default USD).
 * - `percent`:  el valor crudo se interpreta como porcentaje ya escalado
 *               (ej. 42 → "42 %"); pasar `valueScale: 100` si llega como ratio (0.42).
 * - `integer`:  entero con separadores de miles, sin decimales.
 * - `number`:   número con separadores y hasta 2 decimales.
 * - `auto`:     el frontend decide según el contexto del widget.
 */
export type ValueFormat = "currency" | "percent" | "integer" | "number" | "auto";

export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  description?: string;
  /** Indica que el resultado proviene de una búsqueda aproximada de reintento. */
  auto_discovery?: boolean;
  data: Array<Record<string, unknown>>;
  /** Ejes / claves para bar y line. */
  xKey?: string;
  yKey?: string;
  /** Claves para pie. */
  categoryKey?: string;
  valueKey?: string;
  /** Valor del KPI (numérico crudo). */
  metric?: number | null;
  /** Texto auxiliar bajo el valor (insight o subtítulo). */
  subtext?: string;

  // ─── Contrato de formato ─────────────────────────────────────────────────
  /** Cómo formatear los números del widget (aplica a KPI, ejes Y, tooltips,
   *  legend de pie, y celdas detectadas como numéricas en tabla). */
  value_format?: ValueFormat;
  /** ISO 4217. Sólo se usa cuando `value_format === "currency"`. Default "USD".
   *  El backend manda `null` cuando no aplica; `formatMetric` lo normaliza. */
  currency?: string | null;
  /** Sufijo opcional para añadir tras el valor (ej. "movimientos"). */
  unit?: string | null;
}

export interface AnalysisResponse {
  intent: string;
  mode: "replace" | "append" | "update";
  widgets: Widget[];
}
