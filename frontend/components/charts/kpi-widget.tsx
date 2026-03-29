"use client";

import { Trash2 } from "lucide-react";
import { Widget } from "./types";

interface KPIWidgetProps {
  widget: Widget;
  onRemove: (id: string) => void;
  color?: string;
}

export function KPIWidget({ widget, onRemove, color = "var(--foreground)" }: KPIWidgetProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm relative group flex flex-col justify-center min-h-[160px]">
      <button onClick={() => onRemove(widget.id)} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500 transition-opacity">
        <Trash2 size={16} />
      </button>
      <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">{widget.title}</h3>
      <div className="text-4xl font-extrabold tracking-tight mb-2 transition-colors duration-300" style={{ color: color !== "var(--foreground)" ? color : undefined }}>
        {widget.metric}
      </div>
      {widget.subtext && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
          {widget.subtext}
        </p>
      )}
    </div>
  );
}
