export function formatCurrency(
  value: number,
  currency: string | null | undefined = "USD",
): string {
  // `currency` puede llegar como null explícito desde el backend (cuando el
  // widget NO se declaró como currency); el default `= "USD"` sólo cubre
  // `undefined`, así que normalizamos con `??`.
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency ?? "USD",
  }).format(value);
}

export function formatNumber(value: number, fractionDigits = 2): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatInteger(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

export function formatPercent(value: number, fractionDigits = 1): string {
  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  }).format(value)} %`;
}

export type MetricFormat = "currency" | "percent" | "integer" | "number" | "auto";

export interface FormatMetricOptions {
  format?: MetricFormat;
  /** ISO 4217 cuando format = "currency". Acepta null/undefined → "USD". */
  currency?: string | null;
  /** Sufijo opcional ("movimientos", "ventas", ...). Acepta null. */
  unit?: string | null;
  /** Cuando el valor venga como ratio 0-1 y quieras mostrarlo como %, pasa 100. */
  valueScale?: number;
  /** Render cuando el valor es nulo o no numérico. */
  fallback?: string;
}

/**
 * Formatea un valor numérico según el contrato del widget.
 * Devuelve `fallback` (default "—") cuando el valor es nulo / no numérico.
 */
export function formatMetric(value: unknown, opts: FormatMetricOptions = {}): string {
  const {
    format = "auto",
    currency,
    unit,
    valueScale = 1,
    fallback = "—",
  } = opts;
  const resolvedCurrency = currency ?? "USD";

  if (value === null || value === undefined) return fallback;
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  const scaled = num * valueScale;

  let base: string;
  switch (format) {
    case "currency":
      base = formatCurrency(scaled, resolvedCurrency);
      break;
    case "percent":
      base = formatPercent(scaled);
      break;
    case "integer":
      base = formatInteger(scaled);
      break;
    case "number":
      base = formatNumber(scaled);
      break;
    case "auto":
    default:
      // Decide por magnitud: enteros pequeños → integer; el resto → number.
      base = Number.isInteger(scaled) && Math.abs(scaled) < 10_000
        ? formatInteger(scaled)
        : formatNumber(scaled);
      break;
  }

  return unit ? `${base} ${unit}` : base;
}

/**
 * Parsea un string ISO/SQL del backend a un Date.
 *
 * Casos manejados:
 * - `Date` → se devuelve tal cual.
 * - `YYYY-MM-DD` (solo fecha) → medianoche LOCAL (evita off-by-one con `new Date(string)`
 *   que JS parsea como UTC para ese formato).
 * - `YYYY-MM-DD HH:MM:SS[.fraction]` (formato SQL sin TZ) → se interpreta como **UTC**.
 *   El backend siempre persiste en UTC, y JS por default trataría este formato como
 *   local time, produciendo un desfase del offset del cliente.
 * - Cualquier otro string (ISO 8601 con `T` y `Z`/offset) → se delega a `new Date()`,
 *   que interpreta correctamente la zona.
 */
export function parseApiDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  const sqlMatch = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2}(?:\.\d+)?)$/.exec(value);
  if (sqlMatch) {
    return new Date(`${sqlMatch[1]}T${sqlMatch[2]}Z`);
  }
  return new Date(value);
}

/** Día/mes/año en la TZ del browser. */
export function formatDate(value: string | Date, locale = "es-ES"): string {
  const date = parseApiDate(value);
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/** Día y hora en la TZ del browser. */
export function formatDateTime(value: string | Date, locale = "es-ES"): string {
  const date = parseApiDate(value);
  return date.toLocaleString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** YYYY-MM-DD de hoy en TZ local. */
export function todayIsoDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Verdadero si `value` cae en el mismo día calendario que `reference`
 * en la TZ del browser. `reference` default = ahora.
 */
export function isSameLocalDay(value: string | Date, reference: Date = new Date()): boolean {
  const a = parseApiDate(value);
  return (
    a.getFullYear() === reference.getFullYear() &&
    a.getMonth() === reference.getMonth() &&
    a.getDate() === reference.getDate()
  );
}

/** TZ IANA del browser (ej. "America/Guayaquil"). */
export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}
