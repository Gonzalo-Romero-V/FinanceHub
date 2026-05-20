"use client";

import { Trash2 } from "lucide-react";
import { Widget } from "./types";
import { formatMetric, type MetricFormat } from "@/lib/utils/format";

interface TableWidgetProps {
  widget: Widget;
  onRemove: (id: string) => void;
}

const CURRENCY_HINTS = ["monto", "saldo", "balance", "total", "amount", "value", "valor"];
const COUNT_HINTS = ["count", "cantidad", "n_movimientos", "movimientos", "total_movimientos"];
const PERCENT_HINTS = ["porcentaje", "pct", "ratio", "share", "%"];

/**
 * Decide cómo formatear cada columna de la tabla.
 * - Si el widget declara `value_format`, se aplica a TODAS las columnas
 *   numéricas detectadas (el LLM eligió un formato global).
 * - Si no, heurística por nombre de columna sobre el header.
 */
function pickColumnFormat(column: string, widgetFormat: MetricFormat | undefined): MetricFormat | null {
  if (widgetFormat && widgetFormat !== "auto") return widgetFormat;
  const c = column.toLowerCase();
  if (PERCENT_HINTS.some((h) => c.includes(h))) return "percent";
  if (CURRENCY_HINTS.some((h) => c.includes(h))) return "currency";
  if (COUNT_HINTS.some((h) => c.includes(h))) return "integer";
  return null;
}

function isNumericLike(value: unknown): boolean {
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string" && value.trim() !== "") {
    return Number.isFinite(Number(value));
  }
  return false;
}

export function TableWidget({ widget, onRemove }: TableWidgetProps) {
  const columns = widget.data.length > 0 ? Object.keys(widget.data[0]) : [];

  // Pre-calculo el formato por columna (un único pass).
  const columnFormats: Record<string, MetricFormat | null> = {};
  for (const col of columns) {
    const sample = widget.data.find((row) => row[col] !== null && row[col] !== undefined)?.[col];
    columnFormats[col] = isNumericLike(sample) ? pickColumnFormat(col, widget.value_format) : null;
  }

  return (
    <div className="bg-card text-card-foreground rounded-xl p-6 border border-border shadow-sm relative group sm:col-span-2 xl:col-span-3">
      <button
        onClick={() => onRemove(widget.id)}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-2 hover:bg-destructive/10 rounded-lg text-destructive transition-opacity z-10"
        aria-label="Quitar tabla"
      >
        <Trash2 size={16} />
      </button>
      <h3 className="small font-medium text-foreground mb-4">{widget.title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full small text-left">
          <thead className="xs text-muted-foreground uppercase border-b border-border bg-muted/30">
            <tr>
              {columns.map((col) => {
                const isNumeric = columnFormats[col] !== null;
                return (
                  <th
                    key={col}
                    className={`px-4 py-3 font-semibold ${isNumeric ? "text-right tabular-nums" : ""}`}
                  >
                    {col}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {widget.data.map((row, i) => (
              <tr key={i} className="hover:bg-muted/30 transition-colors">
                {columns.map((col) => {
                  const fmt = columnFormats[col];
                  const raw = row[col];
                  const isNumeric = fmt !== null;
                  const cell = isNumeric && raw !== null && raw !== undefined
                    ? formatMetric(raw, {
                        format: fmt!,
                        currency: widget.currency,
                      })
                    : (raw as React.ReactNode);
                  return (
                    <td
                      key={`${i}-${col}`}
                      className={`px-4 py-3 text-foreground/90 ${isNumeric ? "text-right tabular-nums" : ""}`}
                    >
                      {cell ?? "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
