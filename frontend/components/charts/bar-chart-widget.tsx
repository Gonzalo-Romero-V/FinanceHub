"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Trash2 } from "lucide-react";
import { Widget } from "./types";

interface BarChartWidgetProps {
  widget: Widget;
  onRemove: (id: string) => void;
  fillColor?: string;
}

export function BarChartWidget({ widget, onRemove, fillColor = "var(--chart-1)" }: BarChartWidgetProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm relative group flex flex-col h-80">
      <button onClick={() => onRemove(widget.id)} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500 transition-opacity z-10">
        <Trash2 size={16} />
      </button>
      <h3 className="text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-4">{widget.title}</h3>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={widget.data}>
            <defs>
              <linearGradient id={`barGradient-${widget.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={fillColor} stopOpacity={1} />
                <stop offset="100%" stopColor={fillColor} stopOpacity={0.6} />
              </linearGradient>
              <filter id="shadow" height="130%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
                <feOffset dx="0" dy="2" result="offsetblur" />
                <feComponentTransfer>
                  <feFuncA type="linear" slope="0.2" />
                </feComponentTransfer>
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
            <XAxis dataKey={widget.xKey} fontSize={12} tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)' }} dy={10} />
            <YAxis fontSize={12} tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)' }} dx={-10} />
            <Tooltip 
              cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
              contentStyle={{ 
                borderRadius: "12px", 
                border: "1px solid var(--border)", 
                backgroundColor: "var(--popover)", 
                color: "var(--popover-foreground)",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" 
              }} 
              itemStyle={{ color: "var(--popover-foreground)" }} 
            />
            <Bar dataKey={widget.yKey!} fill={`url(#barGradient-${widget.id})`} radius={[4, 4, 0, 0]} barSize={widget.data.length > 10 ? undefined : 30} filter="url(#shadow)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
