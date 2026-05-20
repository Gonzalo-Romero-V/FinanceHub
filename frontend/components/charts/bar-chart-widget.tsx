"use client";

import React, { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Widget } from "./types";
import { WidgetCard } from "./widget-card";
import { formatMetric } from "@/lib/utils/format";
import { chartTooltipStyle, chartAxisTick, chartGridStroke } from "./chart-theme";

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
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const formatOpts = {
    format: widget.value_format ?? "currency",
    currency: widget.currency,
    unit: widget.unit,
  } as const;

  const fmt = (v: unknown) => formatMetric(v, formatOpts);

  const xKey = widget.xKey || "label";
  const yKey = widget.yKey || "value";

  // Calcular el total para mostrar el peso de cada barra en el tooltip
  const total = widget.data.reduce((acc, curr) => acc + (Number(curr[yKey]) || 0), 0);

  return (
    <WidgetCard
      title={widget.title}
      description={widget.description}
      accentColor={fillColor}
      onRemove={() => onRemove(widget.id)}
      bodyClassName="h-72 w-full"
    >
      {mounted && (
        <div className="h-full w-full min-h-[288px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={widget.data}
              margin={{ top: 10, right: 10, bottom: 25, left: 10 }}
            >
              <defs>
                <linearGradient id={`barGradient-${widget.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={fillColor} stopOpacity={1} />
                  <stop offset="100%" stopColor={fillColor} stopOpacity={0.5} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridStroke} />
              <XAxis
                dataKey={xKey}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tick={chartAxisTick}
                dy={6}
                minTickGap={20}
              />
              <YAxis
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tick={chartAxisTick}
                tickFormatter={(v) => fmt(v)}
                width={70}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.35 }}
                contentStyle={chartTooltipStyle}
                itemStyle={{ color: "var(--popover-foreground)" }}
                labelStyle={{ color: "var(--muted-foreground)", marginBottom: 4 }}
                formatter={(value: unknown) => {
                  const valNum = Number(value) || 0;
                  const percent = total > 0 ? ((valNum / total) * 100).toFixed(1) : "0";
                  return [`${fmt(value)} (${percent}%)`, "Valor"];
                }}
              />
              <Bar
                dataKey={yKey}
                fill={`url(#barGradient-${widget.id})`}
                radius={[6, 6, 0, 0]}
                barSize={widget.data.length > 10 ? undefined : 28}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </WidgetCard>
  );
  }
