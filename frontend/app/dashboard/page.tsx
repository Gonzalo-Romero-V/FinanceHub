"use client";

import React, { useState } from "react";
import { Send, LayoutDashboard, Loader2, Activity } from "lucide-react";
import { WidgetRenderer, AnalysisResponse } from "@/components/charts";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useAuth } from "@/app/context/AuthContext";

export default function DashboardPage() {
  const { user } = useAuth();
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
      const baseUrl = process.env.NEXT_PUBLIC_LLM_API_BASE_URL;
      const resp = await fetch(`${baseUrl}/api/analyze`, {
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
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)] bg-background p-4 gap-6">

      <aside className="w-full lg:w-80 xl:w-96 flex flex-col gap-5 bg-card border border-border rounded-[2rem] p-6 shadow-sm h-fit lg:sticky lg:top-6 shrink-0">
        <div className="mb-2">
          <p className="small text-muted-foreground mb-1">Bienvenido de vuelta,</p>
          <h2 className="h3 text-foreground font-bold">{user?.name || 'Cargando...'}</h2>
        </div>
        <hr className="border-border" />
        <h2 className="h3 text-foreground flex items-center gap-3">
          <div className="p-2 bg-brand-1 rounded-lg text-white shadow-md shadow-brand-1/20">
            <LayoutDashboard size={20} />
          </div>
          AI Builder
        </h2>

        <div className="flex flex-col gap-2">
          <Label className="xs font-bold text-muted-foreground uppercase tracking-widest">Modo de Inserción</Label>
          <Select
            value={modeConfig}
            onValueChange={(value) => setModeConfig(value as any)}
          >
            <SelectTrigger className="small w-full bg-muted/50 dark:bg-zinc-900 border border-border text-foreground rounded-xl p-3 h-auto focus:ring-2 focus:ring-brand-1/50 transition-shadow">
              <SelectValue placeholder="Seleccionar modo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto (Por Intención AI)</SelectItem>
              <SelectItem value="replace">Reemplazar Todo</SelectItem>
              <SelectItem value="append">Mantener y Añadir</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="relative group">
          <Label className="xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Prompt</Label>
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
            className="small w-full bg-muted/50 dark:bg-zinc-900 text-foreground rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-brand-1/50 border border-border resize-none h-32 transition-all disabled:opacity-50"
          />
        </div>

        {error && (
          <div className="small text-destructive p-3 bg-destructive/10 border border-destructive/20 rounded-xl font-medium">
            {error}
          </div>
        )}

        <Button
          onClick={handleGenerate}
          disabled={isLoading || !prompt.trim()}
          className="w-full h-12 bg-brand-1 hover:bg-brand-1/90 text-white rounded-xl font-bold shadow-lg shadow-brand-1/20 transition-all active:scale-95"
        >
          {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
          {isLoading ? "Analizando & Dibujando..." : "Generar Insights"}
        </Button>
      </aside>

      <main className="flex-1 w-full overflow-hidden">
        {analysis?.widgets?.length ? (
          <div className="flex flex-col gap-6">
            {analysis.intent && (
              <div className="bg-card px-6 py-4 rounded-xl border border-border shadow-sm flex items-center justify-between gap-4">
                <div>
                  <p className="xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Intención Identificada</p>
                  <p className="text-foreground font-medium">{analysis.intent}</p>
                </div>
                <div className="xs px-3 py-1 rounded-full bg-brand-1/10 text-brand-1 font-bold uppercase tracking-wider">
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
          <div className="h-full min-h-[60vh] flex flex-col items-center justify-center text-center p-8 bg-muted/10 border-2 border-dashed border-border rounded-[2rem]">
            <div className="w-20 h-20 bg-muted/20 rounded-full flex items-center justify-center mb-6">
              <Activity size={32} className="text-muted-foreground" />
            </div>
            <h2 className="h2 text-foreground mb-2">Lienzo en Blanco</h2>
            <p className="small text-muted-foreground max-w-sm">
              Describe los datos, gráficos o indicadores que necesitas ver, y el motor de IA los construirá en segundos.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
