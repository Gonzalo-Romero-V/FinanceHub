"use client";

import React from "react";
import { Widget } from "./types";
import { BarChartWidget } from "./bar-chart-widget";
import { LineChartWidget } from "./line-chart-widget";
import { PieChartWidget } from "./pie-chart-widget";
import { TableWidget } from "./table-widget";
import { KPIWidget } from "./kpi-widget";
import { Trash2, AlertCircle, Database } from "lucide-react";

interface WidgetRendererProps {
  widget: Widget;
  onRemove: (id: string) => void;
}

export function normalizeWidget(w: Widget): Widget {
  const normalized = { ...w };

  if (w.type === "kpi") {
    return normalized;
  }

  if (!w.data || w.data.length === 0) {
    return normalized;
  }

  const firstItem = w.data[0];
  if (!firstItem || typeof firstItem !== "object") {
    return normalized;
  }

  const keys = Object.keys(firstItem);
  
  if (keys.length > 0) {
    if (!normalized.xKey) normalized.xKey = keys[0];
    if (!normalized.yKey && keys.length > 1) {
      const numericKey = keys.find(k => typeof firstItem[k] === 'number');
      normalized.yKey = numericKey || keys[1];
    }
    
    if (!normalized.categoryKey) normalized.categoryKey = keys[0];
    if (!normalized.valueKey && keys.length > 1) {
      const numericKey = keys.find(k => typeof firstItem[k] === 'number');
      normalized.valueKey = numericKey || keys[1];
    }
  }

  return normalized;
}

export function WidgetRenderer({ widget, onRemove }: WidgetRendererProps) {
  if (!widget) return null;

  if (widget.type !== "kpi" && (!widget.data || !Array.isArray(widget.data) || widget.data.length === 0)) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col items-center justify-center h-80 text-center relative group sm:col-span-2 xl:col-span-1">
        <button onClick={() => onRemove(widget.id)} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500 transition-opacity z-10">
          <Trash2 size={16} />
        </button>
        <Database className="text-zinc-300 dark:text-zinc-700 mb-3" size={32} />
        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">{widget.title}</h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Datos insuficientes o formato inválido.</p>
      </div>
    );
  }

  const normalized = normalizeWidget(widget);

  try {
    switch (normalized.type) {
      case "bar": return <BarChartWidget widget={normalized} onRemove={onRemove} />;
      case "line": return <LineChartWidget widget={normalized} onRemove={onRemove} />;
      case "pie": return <PieChartWidget widget={normalized} onRemove={onRemove} />;
      case "table": return <TableWidget widget={normalized} onRemove={onRemove} />;
      case "kpi": return <KPIWidget widget={normalized} onRemove={onRemove} />;
      default: return null;
    }
  } catch (error) {
    console.error(`Error rendering widget ${widget.id}:`, error);
    return (
      <div className="bg-red-50 dark:bg-red-950/20 rounded-xl p-6 border border-red-200 dark:border-red-900 shadow-sm flex flex-col items-center justify-center h-80 text-center relative group sm:col-span-2 xl:col-span-1">
        <button onClick={() => onRemove(widget.id)} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-2 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg text-red-600 transition-opacity z-10">
          <Trash2 size={16} />
        </button>
        <AlertCircle className="text-red-400 mb-3" size={32} />
        <h3 className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">Error de Renderizado</h3>
        <p className="text-xs text-red-600 dark:text-red-400 px-4">No se pudo generar el visualizador para "{widget.title}".</p>
      </div>
    );
  }
}
