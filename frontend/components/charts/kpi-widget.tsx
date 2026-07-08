"use client";

import { Widget } from "./types";
import { WidgetCard } from "./widget-card";
import { formatMetric } from "@/lib/utils/format";

interface KPIWidgetProps {
  widget: Widget;
  onRemove: (id: string) => void;
  color?: string;
}

export function KPIWidget({ widget, onRemove, color = "var(--brand-1)" }: KPIWidgetProps) {
  const value = formatMetric(widget.metric, {
    format: widget.value_format ?? "currency",
    currency: widget.currency,
    unit: widget.unit,
  });

  return (
    <WidgetCard
      title={widget.title}
      description={widget.description}
      subtitle={widget.auto_discovery ? "Resultado aproximado" : undefined}
      accentColor={color}
      onRemove={() => onRemove(widget.id)}
      bodyClassName="flex flex-col justify-center"
    >
      <div className="flex flex-col">
        <span
          className="h1 tracking-tight tabular-nums leading-none"
          style={{ color }}
        >
          {value}
        </span>
        {widget.subtext && (
          <p className="xs text-muted-foreground mt-3">{widget.subtext}</p>
        )}
      </div>
    </WidgetCard>
  );
}
