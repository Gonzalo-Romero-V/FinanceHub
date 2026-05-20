"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Trash2 } from "lucide-react";
import { Widget } from "./types";
import { formatMetric } from "@/lib/utils/format";

interface BarChartWidgetProps {
  widget: Widget;
  onRemove: (id: string) => void;
  fillColor?: string;
}

export function BarChartWidget({
  widget,
  onRemove,
  fillColor = "var(--chart-1)",
}: BarChartWidgetProps) {
  const formatOpts = {
    format: widget.value_format ?? "currency",
    currency: widget.currency,
    unit: widget.unit,
  } as const;

  const fmt = (v: unknown) => formatMetric(v, formatOpts);

  return (
    <div className="bg-card text-card-foreground rounded-xl p-6 border border-border shadow-sm relative group flex flex-col h-80">
      <button
        onClick={() => onRemove(widget.id)}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-2 hover:bg-destructive/10 rounded-lg text-destructive transition-opacity z-10"
        aria-label="Quitar gráfico"
      >
        <Trash2 size={16} />
      </button>
      <h3 className="small font-medium text-foreground mb-4">{widget.title}</h3>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={widget.data}>
            <defs>
              <linearGradient id={`barGradient-${widget.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={fillColor} stopOpacity={1} />
                <stop offset="100%" stopColor={fillColor} stopOpacity={0.6} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
            <XAxis
              dataKey={widget.xKey}
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)" }}
              dy={10}
            />
            <YAxis
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)" }}
              tickFormatter={(v) => fmt(v)}
              width={70}
              dx={-4}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.4 }}
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid var(--border)",
                backgroundColor: "var(--popover)",
                color: "var(--popover-foreground)",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
              }}
              itemStyle={{ color: "var(--popover-foreground)" }}
              formatter={(v: unknown) => [fmt(v), widget.yKey ?? ""]}
            />
            <Bar
              dataKey={widget.yKey!}
              fill={`url(#barGradient-${widget.id})`}
              radius={[4, 4, 0, 0]}
              barSize={widget.data.length > 10 ? undefined : 30}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
