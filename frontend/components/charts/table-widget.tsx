"use client";

import { Widget } from "./types";
import { WidgetCard } from "./widget-card";
import { formatMetric, type MetricFormat } from "@/lib/utils/format";

interface TableWidgetProps {
  widget: Widget;
  onRemove: (id: string) => void;
}

const CURRENCY_HINTS = ["monto", "saldo", "balance", "total", "amount", "value", "valor"];
const COUNT_HINTS = ["count", "cantidad", "n_movimientos", "movimientos", "total_movimientos"];
const PERCENT_HINTS = ["porcentaje", "pct", "ratio", "share", "%"];

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

  const columnFormats: Record<string, MetricFormat | null> = {};
  for (const col of columns) {
    const sample = widget.data.find((row) => row[col] !== null && row[col] !== undefined)?.[col];
    columnFormats[col] = isNumericLike(sample) ? pickColumnFormat(col, widget.value_format) : null;
  }

  return (
    <WidgetCard
      title={widget.title}
      description={widget.description}
      onRemove={() => onRemove(widget.id)}
      className="sm:col-span-2 xl:col-span-3"
    >
      <div className="overflow-auto max-h-80 rounded-lg border border-border/60">
        <table className="w-full small text-left">
          <thead className="sticky top-0 z-10 bg-muted/50 backdrop-blur-sm">
            <tr>
              {columns.map((col) => {
                const isNumeric = columnFormats[col] !== null;
                return (
                  <th
                    key={col}
                    className={`px-3 py-2 xs uppercase tracking-wider font-bold text-muted-foreground/80 ${
                      isNumeric ? "text-right tabular-nums" : "text-left"
                    }`}
                  >
                    {col}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
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
                      className={`px-3 py-2.5 text-foreground/90 ${
                        isNumeric ? "text-right tabular-nums font-medium" : ""
                      }`}
                    >
                      {cell ?? <span className="text-muted-foreground">—</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </WidgetCard>
  );
}
