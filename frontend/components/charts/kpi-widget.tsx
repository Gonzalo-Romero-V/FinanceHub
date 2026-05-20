"use client";

import { Trash2 } from "lucide-react";
import { Widget } from "./types";
import { formatMetric } from "@/lib/utils/format";

interface KPIWidgetProps {
  widget: Widget;
  onRemove: (id: string) => void;
  color?: string;
}

export function KPIWidget({ widget, onRemove, color = "var(--foreground)" }: KPIWidgetProps) {
  const value = formatMetric(widget.metric, {
    format: widget.value_format ?? "currency",
    currency: widget.currency,
    unit: widget.unit,
  });

  return (
    <div className="bg-card text-card-foreground rounded-xl p-6 border border-border shadow-sm relative group flex flex-col justify-center min-h-[160px]">
      <button
        onClick={() => onRemove(widget.id)}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-2 hover:bg-destructive/10 rounded-lg text-destructive transition-opacity"
        aria-label="Quitar KPI"
      >
        <Trash2 size={16} />
      </button>
      <h3 className="xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        {widget.title}
      </h3>
      <div
        className="h1 tracking-tight mb-2 transition-colors duration-300"
        style={{ color: color !== "var(--foreground)" ? color : undefined }}
      >
        {value}
      </div>
      {widget.subtext && (
        <p className="xs text-muted-foreground font-medium">{widget.subtext}</p>
      )}
    </div>
  );
}
