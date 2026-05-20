"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Trash2 } from "lucide-react";
import { Widget } from "./types";
import { formatMetric } from "@/lib/utils/format";

const DEFAULT_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-8)",
];

interface PieChartWidgetProps {
  widget: Widget;
  onRemove: (id: string) => void;
  colors?: string[];
}

export function PieChartWidget({ widget, onRemove, colors = DEFAULT_COLORS }: PieChartWidgetProps) {
  const formatOpts = {
    format: widget.value_format ?? "currency",
    currency: widget.currency,
    unit: widget.unit,
  } as const;

  const fmt = (v: unknown) => formatMetric(v, formatOpts);
  const valueKey = widget.valueKey!;

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
          <PieChart>
            <Pie
              data={widget.data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={70}
              paddingAngle={2}
              dataKey={valueKey}
              nameKey={widget.categoryKey!}
            >
              {widget.data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colors[index % colors.length]}
                  stroke="rgba(0,0,0,0.1)"
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid var(--border)",
                backgroundColor: "var(--popover)",
                color: "var(--popover-foreground)",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
              }}
              itemStyle={{ color: "var(--popover-foreground)" }}
              formatter={(value: unknown, _name, entry) => {
                const label = (entry?.payload?.[widget.categoryKey!] as string) ?? "";
                return [fmt(value), label];
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: "12px", paddingTop: "20px" }}
              formatter={(label: string, entry) => {
                const value = (entry?.payload as Record<string, unknown> | undefined)?.[valueKey];
                return value !== undefined ? `${label} — ${fmt(value)}` : label;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
