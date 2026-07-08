"use client";

import React, { useEffect, useState } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Widget } from "./types";
import { WidgetCard } from "./widget-card";
import { formatMetric } from "@/lib/utils/format";
import { chartTooltipStyle } from "./chart-theme";

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
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const formatOpts = {
    format: widget.value_format ?? "currency",
    currency: widget.currency,
    unit: widget.unit,
  } as const;

  const fmt = (v: unknown) => formatMetric(v, formatOpts);

  const valueKey = widget.valueKey || "value";
  const categoryKey = widget.categoryKey || "label";

  // Calcular el total para obtener porcentajes reales
  const total = widget.data.reduce((acc, curr) => acc + (Number(curr[valueKey]) || 0), 0);

  return (
    <WidgetCard
      title={widget.title}
      description={widget.description}
      subtitle={widget.auto_discovery ? "Resultado aproximado" : undefined}
      accentColor={colors[0]}
      onRemove={() => onRemove(widget.id)}
      bodyClassName="h-72 w-full"
    >
      {mounted && (
        <div className="h-full w-full min-h-[288px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={widget.data}
                cx="50%"
                cy="45%"
                innerRadius={60}
                outerRadius={85}
                paddingAngle={5}
                dataKey={valueKey}
                nameKey={categoryKey}
                strokeWidth={2}
                stroke="var(--card)"
                isAnimationActive={false}
              >
                {widget.data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={chartTooltipStyle}
                itemStyle={{ color: "var(--popover-foreground)" }}
                formatter={(value: unknown, name: unknown) => {
                  const valNum = Number(value) || 0;
                  const percent = total > 0 ? ((valNum / total) * 100).toFixed(1) : "0";
                  return [`${fmt(value)} (${percent}%)`, String(name)];
                }}
              />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }}
                formatter={(label: string, entry: any) => {
                  const value = entry?.payload?.[valueKey];
                  const valNum = Number(value) || 0;
                  const percent = total > 0 ? ((valNum / total) * 100).toFixed(1) : "0";
                  return (
                    <span className="text-muted-foreground">
                      {label}
                      {value !== undefined && (
                        <span className="ml-1 text-foreground font-medium">
                          {fmt(value)} <span className="text-[10px] opacity-60">({percent}%)</span>
                        </span>
                      )}
                    </span>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </WidgetCard>
  );
}
