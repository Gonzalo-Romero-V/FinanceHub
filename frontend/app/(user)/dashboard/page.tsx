"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Send, LayoutDashboard, Loader2, Activity } from "lucide-react";

import { WidgetRenderer, AnalysisResponse, UsageBar } from "@/components/charts";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VoiceRecorderButton } from "@/components/voice/voice-recorder-button";
import { VoiceMovimientoCapture, estadoVozToFormState } from "@/components/voice/voice-movimiento-capture";
import { MovimientoForm, type MovimientoFormState } from "@/components/forms/movimiento-form";
import { FormError } from "@/components/ui/form-error";
import { CoachMark } from "@/components/onboarding/coach-mark";

import { useAuth } from "@/lib/auth/context";
import { analyzeRequest, getUsage, type UsageResponse } from "@/lib/api/llm";
import { listConceptos, conceptoColor, type Concepto } from "@/lib/api/conceptos";
import { listCuentas, cuentaColor, type Cuenta } from "@/lib/api/cuentas";
import { transcribeAudio } from "@/lib/api/voice";

export default function DashboardPage() {
  const { user, token } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [modeConfig, setModeConfig] = useState<"auto" | "replace" | "append">("auto");
  const [error, setError] = useState<string | null>(null);
  const [conceptos, setConceptos] = useState<Concepto[]>([]);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [usage, setUsage] = useState<UsageResponse | null>(null);

  const [isVoiceProcessing, setIsVoiceProcessing] = useState(false);
  const [showVoiceCapture, setShowVoiceCapture] = useState(false);
  const [voiceInitialTexto, setVoiceInitialTexto] = useState<string | undefined>(undefined);
  const [voiceResolvedState, setVoiceResolvedState] = useState<Partial<MovimientoFormState> | null>(null);

  const refreshUsage = () => {
    if (!token) return;
    getUsage(token).then(setUsage).catch(() => {});
  };

  useEffect(() => {
    if (!token) return;
    listConceptos(token)
      .then((res) => setConceptos(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
    listCuentas(token)
      .then((res) => setCuentas(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
    refreshUsage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Índices por ID (contrato actual) y nombre (compatibilidad con respuestas viejas).
  const conceptoColors = useMemo(() => {
    const byId: Record<string, string> = {};
    const byName: Record<string, string> = {};
    for (const c of conceptos) {
      const color = conceptoColor(c);
      byId[String(c.id)] = color;
      byName[c.nombre] = color;
    }
    return { byId, byName };
  }, [conceptos]);

  const cuentaColors = useMemo(() => {
    const byId: Record<string, string> = {};
    const byName: Record<string, string> = {};
    for (const c of cuentas) {
      const color = cuentaColor(c);
      byId[String(c.id)] = color;
      byName[c.nombre] = color;
    }
    return { byId, byName };
  }, [cuentas]);

  const handleRemoveWidget = (id: string) => {
    if (!analysis) return;
    setAnalysis({
      ...analysis,
      widgets: analysis.widgets.filter((w) => w.id !== id),
    });
  };

  const handleGenerate = async (overrideText?: string) => {
    const textoConsulta = overrideText ?? prompt;
    if (!textoConsulta.trim() || !token) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = (await analyzeRequest(token, {
        prompt: textoConsulta,
      })) as AnalysisResponse;
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado al generar los widgets.");
    } finally {
      setIsLoading(false);
      refreshUsage();
    }
  };

  const handleVoiceRecording = async (blob: Blob) => {
    if (!token) return;
    setIsVoiceProcessing(true);
    setError(null);
    try {
      const { text, intent } = await transcribeAudio(token, blob, { classify: true });
      if (intent === "registrar_movimiento") {
        setVoiceInitialTexto(text);
        setShowVoiceCapture(true);
      } else {
        await handleGenerate(text);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo procesar el audio.");
    } finally {
      setIsVoiceProcessing(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)] bg-background p-4 gap-6">
      <aside className="w-full lg:w-80 xl:w-96 flex flex-col gap-5 bg-card border border-border rounded-[2rem] p-6 shadow-sm h-fit lg:sticky lg:top-6 shrink-0">
        <div className="mb-2">
          <p className="small text-muted-foreground mb-1">Bienvenido de vuelta,</p>
          <h2 className="h3 text-foreground">{user?.name || "Cargando..."}</h2>
        </div>
        <hr className="border-border" />
        <h2 className="h3 text-foreground flex items-center gap-3">
          <div className="p-2 bg-brand-1 rounded-lg text-white shadow-md shadow-brand-1/20">
            <LayoutDashboard size={20} />
          </div>
          AI Builder
        </h2>

        <div className="flex flex-col gap-2">
          <Label className="xs font-bold text-muted-foreground uppercase tracking-widest">
            Modo de Inserción
          </Label>
          <Select value={modeConfig} onValueChange={(value) => setModeConfig(value as "auto" | "replace" | "append")}>
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

        <CoachMark
          id="llm_dashboard"
          text="Escribe o habla: pregunta sobre tus finanzas o registra un movimiento por voz."
          guideHref="/help"
        >
        <div className="relative group">
          <div className="flex items-center justify-between mb-2">
            <Label className="xs font-bold text-muted-foreground uppercase tracking-widest">
              Prompt
            </Label>
            <VoiceRecorderButton
              onRecordingComplete={handleVoiceRecording}
              isProcessing={isVoiceProcessing}
              disabled={!token || isLoading}
              className="h-7 w-7"
            />
          </div>
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
        </CoachMark>

        {error && <FormError message={error} />}

        <Button
          onClick={() => handleGenerate()}
          disabled={isLoading || !prompt.trim() || !token}
          className="w-full h-12 bg-brand-1 hover:bg-brand-1/90 text-white rounded-xl font-bold shadow-lg shadow-brand-1/20 transition-all active:scale-95"
        >
          {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
          {isLoading ? "Analizando & Dibujando..." : "Generar Insights"}
        </Button>

        {usage && <UsageBar used={usage.used} limit={usage.limit} />}
      </aside>

      <main className="flex-1 w-full overflow-hidden">
        {analysis?.widgets?.length ? (
          <div className="flex flex-col gap-5">
            {analysis.intent && (
              <div className="flex items-center justify-between gap-3 px-1">
                <p className="small text-muted-foreground truncate" title={analysis.intent}>
                  <span className="text-foreground/60">›</span>{" "}
                  <span className="text-foreground/80">{analysis.intent}</span>
                </p>
                <span className="xs px-2 py-0.5 rounded-full bg-brand-1/10 text-brand-1 font-semibold uppercase tracking-wider shrink-0">
                  {modeConfig === "auto" ? analysis.mode : modeConfig}
                </span>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 auto-rows-min">
              {analysis.widgets.map((widget) => (
                <WidgetRenderer
                  key={widget.id}
                  widget={widget}
                  onRemove={handleRemoveWidget}
                  conceptoColors={conceptoColors}
                  cuentaColors={cuentaColors}
                />
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

      <VoiceMovimientoCapture
        open={showVoiceCapture}
        onClose={() => setShowVoiceCapture(false)}
        initialTexto={voiceInitialTexto}
        onCompleto={(estado) => {
          setShowVoiceCapture(false);
          setVoiceResolvedState(estadoVozToFormState(estado));
        }}
      />

      <MovimientoForm
        open={!!voiceResolvedState}
        onClose={() => setVoiceResolvedState(null)}
        onSuccess={() => setVoiceResolvedState(null)}
        initialState={voiceResolvedState ?? undefined}
        initialStep={5}
      />
    </div>
  );
}
