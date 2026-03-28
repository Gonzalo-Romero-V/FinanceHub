"use client";

import React, { useState } from "react";
import { Send, LayoutDashboard, Loader2, Activity } from "lucide-react";
import { WidgetRenderer, AnalysisResponse } from "@/components/charts";

export default function DashboardPage() {
  const [prompt, setPrompt] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [modeConfig, setModeConfig] = useState<"auto" | "replace" | "append">("auto");
  const [error, setError] = useState<string | null>(null);

  const handleRemoveWidget = (id: string) => {
    if (!analysis) return;
    setAnalysis({
      ...analysis,
      widgets: analysis.widgets.filter((w) => w.id !== id),
    });
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setError(null);

    try {
      const resp = await fetch("http://localhost:8001/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!resp.ok) {
        throw new Error("No se pudo conectar con el servicio de análisis de IA.");
      }
      
      const res: AnalysisResponse = await resp.json();
      
      const applyMode = modeConfig === "auto" ? res.mode : modeConfig;

      if (!analysis || applyMode === "replace") {
        setAnalysis(res);
      } else if (applyMode === "append") {
        setAnalysis({
          ...analysis,
          intent: res.intent || analysis.intent,
          widgets: [...res.widgets, ...analysis.widgets],
        });
      } else if (applyMode === "update") {
        const updatedWidgets = analysis.widgets.map((w) => {
          const updateData = res.widgets.find((newW) => newW.id === w.id);
          return updateData ? { ...w, ...updateData } : w;
        });
        
        const existingIds = new Set(analysis.widgets.map((w) => w.id));
        const purelyNewWidgets = res.widgets.filter((w) => !existingIds.has(w.id));
        
        setAnalysis({
          ...analysis,
          intent: res.intent || analysis.intent,
          widgets: [...purelyNewWidgets, ...updatedWidgets],
        });
      }
      setPrompt("");
    } catch (err: any) {
      setError(err.message || "Ocurrió un error inesperado al generar los widgets.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)] bg-zinc-50 dark:bg-black p-4 gap-6">
      
      <aside className="w-full lg:w-80 xl:w-96 flex flex-col gap-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-[1.5rem] p-6 shadow-sm h-fit lg:sticky lg:top-6 shrink-0">
        <h2 className="text-xl font-black text-zinc-900 dark:text-white flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg text-white shadow-md shadow-blue-500/20">
            <LayoutDashboard size={20} />
          </div>
          AI Builder
        </h2>
        
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Modo de Inserción</label>
          <select 
            value={modeConfig} 
            onChange={(e) => setModeConfig(e.target.value as any)}
            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-sm rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-shadow"
          >
            <option value="auto">Auto (Por Intención AI)</option>
            <option value="replace">Reemplazar Todo</option>
            <option value="append">Mantener y Añadir</option>
          </select>
        </div>

        <div className="relative group">
          <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleGenerate();
              }
            }}
            placeholder="Ej: Muestra el crecimiento mensual de usuarios en una gráfica de líneas..."
            className="w-full bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-zinc-200 dark:border-zinc-800 resize-none h-32 transition-all disabled:opacity-50"
          />
        </div>

        {error && (
          <div className="text-red-600 dark:text-red-400 text-sm font-medium p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl">
            {error}
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={isLoading || !prompt.trim()}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white p-3.5 rounded-xl font-bold transition-all disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 active:scale-95"
        >
          {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
          {isLoading ? "Analizando & Dibujando..." : "Generar Insights"}
        </button>
      </aside>

      <main className="flex-1 w-full overflow-hidden">
        {analysis?.widgets?.length ? (
           <div className="flex flex-col gap-6">
            {analysis.intent && (
               <div className="bg-white dark:bg-zinc-950 px-6 py-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between gap-4">
                 <div>
                   <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Intención Identificada</p>
                   <p className="text-zinc-900 dark:text-white font-medium">{analysis.intent}</p>
                 </div>
                 <div className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider">
                    {modeConfig === "auto" ? analysis.mode : modeConfig}
                 </div>
               </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-min">
              {analysis.widgets.map((widget) => (
                <WidgetRenderer key={widget.id} widget={widget} onRemove={handleRemoveWidget} />
              ))}
            </div>
           </div>
        ) : (
          <div className="h-full min-h-[60vh] flex flex-col items-center justify-center text-center p-8 bg-zinc-50 dark:bg-zinc-950/50 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[2rem]">
            <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-6">
              <Activity size={32} className="text-zinc-400 dark:text-zinc-600" />
            </div>
            <h2 className="text-2xl font-black text-zinc-900 dark:text-white mb-2">Lienzo en Blanco</h2>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-sm text-sm">
              Describe los datos, gráficos o indicadores que necesitas ver, y el motor de IA los construirá en segundos.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
