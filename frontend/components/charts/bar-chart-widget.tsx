"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Trash2 } from "lucide-react";
import { Widget } from "./types";

interface BarChartWidgetProps {
  widget: Widget;
  onRemove: (id: string) => void;
  fillColor?: string;
}

export function BarChartWidget({ widget, onRemove, fillColor = "#3b82f6" }: BarChartWidgetProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm relative group flex flex-col h-80">
      <button onClick={() => onRemove(widget.id)} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500 transition-opacity z-10">
        <Trash2 size={16} />
      </button>
      <h3 className="text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-4">{widget.title}</h3>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={widget.data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.15} />
            <XAxis dataKey={widget.xKey} fontSize={12} tickLine={false} axisLine={false} />
            <YAxis fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #27272a", backgroundColor: "#18181b", color: "#fff" }} itemStyle={{ color: "#fff" }} />
            <Bar dataKey={widget.yKey!} fill={fillColor} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
