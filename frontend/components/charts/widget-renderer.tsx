"use client";

import React from "react";
import { AlertCircle, Database, X } from "lucide-react";

import { Widget } from "./types";
import { BarChartWidget } from "./bar-chart-widget";
import { LineChartWidget } from "./line-chart-widget";
import { PieChartWidget } from "./pie-chart-widget";
import { TableWidget } from "./table-widget";
import { KPIWidget } from "./kpi-widget";

interface WidgetRendererProps {
  widget: Widget;
  onRemove: (id: string) => void;
}

export function normalizeWidget(w: Widget): Widget {
  const normalized = { ...w };
  if (w.type === "kpi") return normalized;
  if (!w.data || w.data.length === 0) return normalized;

  const firstItem = w.data[0];
  if (!firstItem || typeof firstItem !== "object") return normalized;

  const keys = Object.keys(firstItem);
  if (keys.length === 0) return normalized;

  const hasLabel = keys.includes("label");
  const hasValue = keys.includes("value");
  const hasX = keys.includes("x");
  const hasY = keys.includes("y");

  // 1. Identificar Claves
  if (!normalized.xKey) {
    if (hasLabel) normalized.xKey = "label";
    else if (hasX) normalized.xKey = "x";
    else normalized.xKey = keys[0];
  }

  if (!normalized.yKey) {
    if (hasValue) normalized.yKey = "value";
    else if (hasY) normalized.yKey = "y";
    else {
      const numericKey = keys.find((k) => {
        const val = firstItem[k];
        return typeof val === "number" || (!isNaN(Number(val)) && val !== "");
      });
      normalized.yKey = numericKey || (keys.length > 1 ? keys[1] : keys[0]);
    }
  }

  if (!normalized.categoryKey) normalized.categoryKey = normalized.xKey || "label";
  if (!normalized.valueKey) normalized.valueKey = normalized.yKey || "value";

  // 2. Limpieza de Datos: Convertir valores a números para Recharts
  const vKey = normalized.valueKey;
  const yK = normalized.yKey;
  
  normalized.data = w.data.map(item => {
    const newItem = { ...item };
    if (vKey && newItem[vKey] !== undefined) newItem[vKey] = Number(newItem[vKey]);
    if (yK && yK !== vKey && newItem[yK] !== undefined) newItem[yK] = Number(newItem[yK]);
    return newItem;
  });

  return normalized;
}

function getSemanticColor(title: string, index: number = 0): string {
  const t = title.toLowerCase();
  // Positivos / Ingresos / Ahorro
  if (
    t.includes("ingreso") ||
    t.includes("growth") ||
    t.includes("crecimiento") ||
    t.includes("roi") ||
    t.includes("ganancia") ||
    t.includes("profit") ||
    t.includes("retorno") ||
    t.includes("ahorro") ||
    t.includes("inversión") ||
    t.includes("plusvalía")
  ) {
    return "var(--chart-3)"; // Verde esmeralda
  }
  // Negativos / Gastos / Deudas
  if (
    t.includes("gasto") ||
    t.includes("egreso") ||
    t.includes("expense") ||
    t.includes("deuda") ||
    t.includes("pérdida") ||
    t.includes("loss") ||
    t.includes("pasivo") ||
    t.includes("pago") ||
    t.includes("comisión")
  ) {
    return "var(--chart-7)"; // Rojo / Naranja intenso
  }
  // Neutrales / Balance / Usuarios
  if (
    t.includes("usuario") ||
    t.includes("user") ||
    t.includes("balance") ||
    t.includes("total") ||
    t.includes("promedio") ||
    t.includes("histórico") ||
    t.includes("cuenta")
  ) {
    return index % 2 === 0 ? "var(--chart-1)" : "var(--chart-2)";
  }
  const defaults = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-4)",
    "var(--chart-5)",
    "var(--chart-6)",
  ];
  return defaults[index % defaults.length];
}

export function WidgetRenderer({ widget, onRemove }: WidgetRendererProps) {
  if (!widget) return null;

  if (widget.type !== "kpi" && (!widget.data || !Array.isArray(widget.data) || widget.data.length === 0)) {
    return (
      <PlaceholderCard
        icon={<Database size={28} className="text-muted-foreground/40" />}
        title={widget.title}
        message="Sin datos para esta consulta."
        onRemove={() => onRemove(widget.id)}
      />
    );
  }

  const normalized = normalizeWidget(widget);
  const semanticColor = getSemanticColor(normalized.title);

  try {
    switch (normalized.type) {
      case "bar":
        return <BarChartWidget widget={normalized} onRemove={onRemove} fillColor={semanticColor} />;
      case "line":
        return <LineChartWidget widget={normalized} onRemove={onRemove} strokeColor={semanticColor} />;
      case "pie":
        return <PieChartWidget widget={normalized} onRemove={onRemove} />;
      case "table":
        return <TableWidget widget={normalized} onRemove={onRemove} />;
      case "kpi":
        return <KPIWidget widget={normalized} onRemove={onRemove} color={semanticColor} />;
      default:
        return null;
    }
  } catch (error) {
    console.error(`Error rendering widget ${widget.id}:`, error);
    return (
      <PlaceholderCard
        icon={<AlertCircle size={28} className="text-destructive" />}
        title="Error de renderizado"
        message={`No se pudo generar el visualizador para "${widget.title}".`}
        onRemove={() => onRemove(widget.id)}
        tone="error"
      />
    );
  }
}

function PlaceholderCard({
  icon,
  title,
  message,
  onRemove,
  tone = "default",
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
  onRemove: () => void;
  tone?: "default" | "error";
}) {
  const isError = tone === "error";
  return (
    <div
      className={`group relative flex flex-col items-center justify-center gap-3 text-center
        rounded-2xl border p-6 shadow-sm h-64
        ${isError ? "bg-destructive/5 border-destructive/30" : "bg-card border-border"}`}
    >
      <button
        type="button"
        onClick={onRemove}
        aria-label="Quitar widget"
        className="absolute top-3 right-3 rounded-lg p-1.5 text-muted-foreground
                   hover:text-destructive hover:bg-destructive/10
                   opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="h-4 w-4" />
      </button>
      {icon}
      <h3
        className={`small font-semibold ${isError ? "text-destructive" : "text-foreground"}`}
        title={title}
      >
        {title}
      </h3>
      <p className="xs text-muted-foreground max-w-xs">{message}</p>
    </div>
  );
}
