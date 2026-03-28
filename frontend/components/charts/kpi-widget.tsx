"use client";

import { Trash2 } from "lucide-react";
import { Widget } from "./types";

interface KPIWidgetProps {
  widget: Widget;
  onRemove: (id: string) => void;
}

export function KPIWidget({ widget, onRemove }: KPIWidgetProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm relative group flex flex-col justify-center">
      <button onClick={() => onRemove(widget.id)} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500 transition-opacity">
        <Trash2 size={16} />
      </button>
      <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">{widget.title}</h3>
      <div className="text-3xl font-bold text-zinc-900 dark:text-white mb-1">{widget.metric}</div>
      {widget.subtext && <p className="text-xs text-zinc-500 dark:text-zinc-400">{widget.subtext}</p>}
    </div>
  );
}
