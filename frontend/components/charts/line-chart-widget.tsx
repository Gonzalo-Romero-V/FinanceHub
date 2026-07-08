"use client";

import React, { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Widget } from "./types";
import { WidgetCard } from "./widget-card";
import { formatMetric } from "@/lib/utils/format";
import { chartTooltipStyle, chartAxisTick, chartGridStroke } from "./chart-theme";

interface LineChartWidgetProps {
  widget: Widget;
  onRemove: (id: string) => void;
  strokeColor?: string;
}

export function LineChartWidget({
  widget,
  onRemove,
  strokeColor = "var(--chart-2)",
}: LineChartWidgetProps) {
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

  // Calcular el total para mostrar el peso de cada punto en el tooltip
  const total = widget.data.reduce((acc, curr) => acc + (Number(curr[yKey]) || 0), 0);

  return (
    <WidgetCard
      title={widget.title}
      description={widget.description}
      subtitle={widget.auto_discovery ? "Resultado aproximado" : undefined}
      accentColor={strokeColor}
      onRemove={() => onRemove(widget.id)}
      bodyClassName="h-72 w-full"
    >
      {mounted && (
        <div className="h-full w-full min-h-[288px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={widget.data}
              margin={{ top: 10, right: 10, bottom: 25, left: 10 }}
            >
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
                contentStyle={chartTooltipStyle}
                itemStyle={{ color: "var(--popover-foreground)" }}
                labelStyle={{ color: "var(--muted-foreground)", marginBottom: 4 }}
                formatter={(value: unknown) => {
                  const valNum = Number(value) || 0;
                  const percent = total > 0 ? ((valNum / total) * 100).toFixed(1) : "0";
                  return [`${fmt(value)} (${percent}%)`, "Valor"];
                }}
              />
              <Line
                type="monotone"
                dataKey={yKey}
                stroke={strokeColor}
                strokeWidth={2.5}
                dot={{ r: 3, fill: strokeColor, strokeWidth: 2, stroke: "var(--background)" }}
                activeDot={{ r: 5, strokeWidth: 0 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </WidgetCard>
  );
  }
