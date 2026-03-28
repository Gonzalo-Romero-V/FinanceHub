"use client";

import { Trash2 } from "lucide-react";
import { Widget } from "./types";

interface TableWidgetProps {
  widget: Widget;
  onRemove: (id: string) => void;
}

export function TableWidget({ widget, onRemove }: TableWidgetProps) {
  const columns = widget.data.length > 0 ? Object.keys(widget.data[0]) : [];
  
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm relative group sm:col-span-2 xl:col-span-3">
      <button onClick={() => onRemove(widget.id)} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500 transition-opacity z-10">
        <Trash2 size={16} />
      </button>
      <h3 className="text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-4">{widget.title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-zinc-500 uppercase border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
            <tr>
              {columns.map(col => (
                <th key={col} className="px-4 py-3 font-semibold">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {widget.data.map((row, i) => (
              <tr key={i} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                {columns.map(col => (
                  <td key={`${i}-${col}`} className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{row[col]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
