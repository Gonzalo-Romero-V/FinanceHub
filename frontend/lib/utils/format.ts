export function formatCurrency(value: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(value);
}

export function formatNumber(value: number, fractionDigits = 2): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/**
 * Parsea un string ISO/SQL del backend a un Date.
 * Acepta `2026-05-18T03:15:00Z`, `2026-05-18 03:15:00`, etc.
 * Si viene `YYYY-MM-DD` (sin hora), lo interpreta como medianoche local
 * para evitar el off-by-one típico de `new Date("2026-05-18")` (que JS
 * parsea como UTC).
 */
export function parseApiDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
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
