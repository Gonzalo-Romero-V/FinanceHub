"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Trash2 } from "lucide-react";
import { Widget } from "./types";

const DEFAULT_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-8)"
];

interface PieChartWidgetProps {
  widget: Widget;
  onRemove: (id: string) => void;
  colors?: string[];
}

export function PieChartWidget({ widget, onRemove, colors = DEFAULT_COLORS }: PieChartWidgetProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm relative group flex flex-col h-80">
      <button onClick={() => onRemove(widget.id)} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500 transition-opacity z-10">
        <Trash2 size={16} />
      </button>
      <h3 className="text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-4">{widget.title}</h3>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={widget.data} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey={widget.valueKey!} nameKey={widget.categoryKey!}>
              {widget.data.map((_, index) => <Cell key={`cell-${index}`} fill={colors[index % colors.length]} stroke="rgba(0,0,0,0.1)" />)}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                borderRadius: "12px", 
                border: "1px solid var(--border)", 
                backgroundColor: "var(--popover)", 
                color: "var(--popover-foreground)",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" 
              }} 
              itemStyle={{ color: "var(--popover-foreground)" }} 
            />
            <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "20px" }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
