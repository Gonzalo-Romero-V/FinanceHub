"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronLeft, ChevronRight, History } from "lucide-react";

import { useAuth } from "@/lib/auth/context";
import { listMovimientos, type MovimientoRaw } from "@/lib/api/movimientos";
import { listReconciliaciones, type Reconciliacion } from "@/lib/api/reconciliaciones";
import { formatCurrency } from "@/lib/utils/format";
import { chartTooltipStyle, chartAxisTick, chartGridStroke } from "@/components/charts/chart-theme";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface CuentaConSaldo {
  id: number;
  nombre: string;
  tipo_cuenta: string; // "Activo" | "Pasivo" — para patrimonio en balance general
  saldo_inicial: number;
  saldo: number; // saldo actual, para el punto sintético de hoy
}

interface HistorialBalanceProps {
  cuentas: CuentaConSaldo[];
  onRefresh?: number;
}

interface RawPoint {
  ts: number; // timestamp ms para ordenar y filtrar
  fecha: Date;
  saldo: number;
  esAjuste?: boolean;
}

interface DataPoint {
  ts: number;
  label: string;
  saldo: number;
  esAjuste?: boolean;
}

// ─── Presets de ventana ───────────────────────────────────────────────────────

type Preset = "1M" | "3M" | "6M" | "1A" | "Todo";

const PRESETS: { key: Preset; label: string; days: number | null }[] = [
  { key: "1M",   label: "1M",   days: 30   },
  { key: "3M",   label: "3M",   days: 90   },
  { key: "6M",   label: "6M",   days: 180  },
  { key: "1A",   label: "1A",   days: 365  },
  { key: "Todo", label: "Todo", days: null },
];

// ─── Helpers de formato ───────────────────────────────────────────────────────

function fmtLabel(date: Date, granularity: "dia" | "semana" | "mes"): string {
  if (granularity === "mes") {
    return date.toLocaleDateString("es", { month: "short", year: "2-digit" });
  }
  if (granularity === "semana") {
    return date.toLocaleDateString("es", { day: "2-digit", month: "short" });
  }
  return date.toLocaleDateString("es", { day: "2-digit", month: "short" });
}

function granularityFor(windowDays: number | null): "dia" | "semana" | "mes" {
  if (windowDays === null || windowDays > 365) return "mes";
  if (windowDays > 90) return "semana";
  return "dia";
}

// ─── Relleno diario (tooltip suave y continuo) ───────────────────────────────
//
// Genera un DataPoint por cada día del rango, llevando el saldo del último
// rawPoint del día hacia adelante. Esto evita huecos en el eje temporal que
// producen el efecto de "escalones".

function fillDailyData(rawPoints: RawPoint[]): DataPoint[] {
  if (rawPoints.length === 0) return [];

  const ONE_DAY = 86_400_000;
  const startTs = new Date(rawPoints[0].ts).setHours(0, 0, 0, 0);
  const endTs   = new Date(rawPoints[rawPoints.length - 1].ts).setHours(0, 0, 0, 0);

  const result: DataPoint[] = [];
  let lastSaldo = rawPoints[0].saldo;
  let rIdx = 0;

  for (let t = startTs; t <= endTs + ONE_DAY / 2; t += ONE_DAY) {
    const dayEnd = t + ONE_DAY - 1;
    let dayEsAjuste: boolean | undefined;

    // Consumir todos los rawPoints que caen en este día
    while (rIdx < rawPoints.length && rawPoints[rIdx].ts <= dayEnd) {
      lastSaldo   = rawPoints[rIdx].saldo;
      dayEsAjuste = dayEsAjuste || rawPoints[rIdx].esAjuste;
      rIdx++;
    }

    result.push({
      ts:       t,
      label:    fmtLabel(new Date(t), "dia"),
      saldo:    lastSaldo,
      esAjuste: dayEsAjuste,
    });
  }

  return result;
}

// ─── Agregación (semana / mes) ────────────────────────────────────────────────

function aggregate(points: RawPoint[], granularity: "semana" | "mes"): DataPoint[] {

  const buckets = new Map<string, RawPoint>();
  for (const p of points) {
    let key: string;
    if (granularity === "semana") {
      // ISO week bucket: year + week number
      const d = p.fecha;
      const jan4 = new Date(d.getFullYear(), 0, 4);
      const week = Math.ceil(((d.getTime() - jan4.getTime()) / 86400000 + jan4.getDay() + 1) / 7);
      key = `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
    } else {
      key = `${p.fecha.getFullYear()}-${String(p.fecha.getMonth() + 1).padStart(2, "0")}`;
    }
    buckets.set(key, p); // last value of the bucket wins
  }

  return Array.from(buckets.values()).map((p) => ({
    ts: p.ts,
    label: fmtLabel(p.fecha, granularity),
    saldo: p.saldo,
    esAjuste: p.esAjuste,
  }));
}

// ─── Cómputo de serie ────────────────────────────────────────────────────────

function getTipo(m: MovimientoRaw): string {
  return (m.concepto as any)?.tipo_movimiento?.nombre
    ?? (m.concepto as any)?.tipoMovimiento?.nombre
    ?? "";
}

function buildSerie(
  cuentas: CuentaConSaldo[],
  movimientos: MovimientoRaw[],
  selectedId: "general" | number,
  windowDays: number | null,
  reconciliaciones: Reconciliacion[],
  frameStart: Date | null,
  frameEnd: Date | null,
): DataPoint[] {
  const realNow = new Date();
  // Límite superior efectivo: fin del frame si está definido, si no "ahora"
  const frameEndEff = frameEnd ?? new Date(realNow.getFullYear(), realNow.getMonth(), realNow.getDate(), 23, 59, 59, 999);
  // Cutoff inferior: frameStart > windowDays > sin límite
  const cutoff = frameStart
    ? frameStart
    : windowDays
      ? new Date(frameEndEff.getTime() - windowDays * 86_400_000)
      : null;

  const sorted = [...movimientos].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

  // ── Computar saldo inicial de la ventana ──────────────────────────────────
  let startingSaldo: number;

  if (selectedId === "general") {
    // Patrimonio neto: activos - pasivos (para coincidir con BalanceGeneral)
    const activos = cuentas.filter((c) => c.tipo_cuenta === "Activo");
    const pasivos = cuentas.filter((c) => c.tipo_cuenta === "Pasivo");
    startingSaldo =
      activos.reduce((s, c) => s + (c.saldo_inicial ?? 0), 0) -
      pasivos.reduce((s, c) => s + (c.saldo_inicial ?? 0), 0);
    for (const m of sorted) {
      if (cutoff && new Date(m.fecha) >= cutoff) break;
      const tipo = getTipo(m);
      if (tipo === "Ingreso") startingSaldo += Number(m.monto);
      else if (tipo === "Egreso") startingSaldo -= Number(m.monto);
    }
  } else {
    const cuenta = cuentas.find((c) => c.id === selectedId);
    if (!cuenta) return [];
    startingSaldo = cuenta.saldo_inicial ?? 0;
    for (const m of sorted) {
      if (cutoff && new Date(m.fecha) >= cutoff) break;
      if (m.cuenta_destino_id === selectedId) startingSaldo += Number(m.monto);
      else if (m.cuenta_origen_id === selectedId) startingSaldo -= Number(m.monto);
    }
  }

  // ── Puntos dentro de la ventana ───────────────────────────────────────────
  const inWindow = sorted.filter((m) => {
    const d = new Date(m.fecha);
    if (cutoff && d < cutoff) return false;
    if (d > frameEndEff) return false;
    return true;
  });

  const rawPoints: RawPoint[] = [];

  // Punto de inicio de ventana
  const startDate = cutoff ?? (inWindow.length > 0 ? new Date(inWindow[0].fecha) : new Date());
  rawPoints.push({ ts: startDate.getTime(), fecha: startDate, saldo: Math.round(startingSaldo * 100) / 100 });

  let running = startingSaldo;
  for (const m of inWindow) {
    const tipo = getTipo(m);
    if (selectedId === "general") {
      if (tipo === "Ingreso") running += Number(m.monto);
      else if (tipo === "Egreso") running -= Number(m.monto);
    } else {
      if (m.cuenta_destino_id === selectedId) running += Number(m.monto);
      else if (m.cuenta_origen_id === selectedId) running -= Number(m.monto);
    }
    const fecha = new Date(m.fecha);
    rawPoints.push({
      ts: fecha.getTime(),
      fecha,
      saldo: Math.round(running * 100) / 100,
      esAjuste: (m.concepto as any)?.nombre?.toLowerCase().includes("ajuste"),
    });
  }

  // ── Puntos de conciliación verificados (solo vista por cuenta) ────────────
  if (selectedId !== "general") {
    for (const r of reconciliaciones) {
      const fecha = new Date(r.fecha);
      if (cutoff && fecha < cutoff) continue;
      if (fecha > frameEndEff) continue;
      rawPoints.push({ ts: fecha.getTime(), fecha, saldo: r.saldo_real });
    }
    rawPoints.sort((a, b) => a.ts - b.ts);
  }

  // ── Punto final del frame ─────────────────────────────────────────────────
  // Para frames actuales (sin frameEnd o frameEnd ≥ hoy) anclar al saldo real
  // de las cuentas para coincidir con BalanceGeneral.
  // Para frames pasados (mes anterior, etc.) usar el saldo calculado (running).
  const todayMidnight = realNow.setHours(0, 0, 0, 0);
  const isPastFrame   = frameEnd !== null && frameEnd.getTime() < todayMidnight;

  const currentSaldo = selectedId === "general"
    ? cuentas.filter((c) => c.tipo_cuenta === "Activo").reduce((s, c) => s + (c.saldo ?? 0), 0) -
      cuentas.filter((c) => c.tipo_cuenta === "Pasivo").reduce((s, c) => s + (c.saldo ?? 0), 0)
    : (cuentas.find((c) => c.id === selectedId)?.saldo ?? running);

  const endSaldo  = isPastFrame ? running : currentSaldo;
  const realSaldo = Math.round(Number(endSaldo) * 100) / 100;
  const endTs     = isPastFrame
    ? new Date(frameEndEff).setHours(12, 0, 0, 0)
    : new Date(todayMidnight).valueOf() + 43_200_000; // hoy al mediodía

  const lastRaw = rawPoints[rawPoints.length - 1];
  if (lastRaw && lastRaw.ts >= (isPastFrame ? frameEndEff.setHours(0, 0, 0, 0) : todayMidnight)) {
    // Ya existe un punto de hoy (o del fin del frame) → actualizar saldo
    rawPoints[rawPoints.length - 1] = { ...lastRaw, saldo: realSaldo };
  } else {
    rawPoints.push({ ts: endTs, fecha: new Date(endTs), saldo: realSaldo });
  }

  // ── Retornar datos ────────────────────────────────────────────────────────
  // Granularidad basada en el tamaño efectivo del frame
  const effectiveDays = frameStart && frameEnd
    ? Math.ceil((frameEnd.getTime() - frameStart.getTime()) / 86_400_000)
    : windowDays;
  const gran = granularityFor(effectiveDays);
  if (gran === "dia") return fillDailyData(rawPoints);
  return aggregate(rawPoints, gran);
}

// ─── Componente ──────────────────────────────────────────────────────────────

export function HistorialBalance({ cuentas, onRefresh }: HistorialBalanceProps) {
  const { token } = useAuth();
  const [movimientos, setMovimientos] = useState<MovimientoRaw[]>([]);
  const [reconciliaciones, setReconciliaciones] = useState<Reconciliacion[]>([]);
  const [selectedId, setSelectedId] = useState<"general" | number>("general");
  const [preset, setPreset] = useState<Preset>("3M");
  const [navOffset, setNavOffset] = useState(0); // meses atrás (solo para "1M")
  const [loading, setLoading] = useState(true);

  // Bug fix: "Todo" tiene days=null; ?? null en lugar de ?? 90
  const windowDays: number | null = PRESETS.find((p) => p.key === preset)?.days ?? null;

  // ── Frame para navegación mensual ─────────────────────────────────────────
  const { frameStart, frameEnd } = useMemo(() => {
    if (preset !== "1M") return { frameStart: null, frameEnd: null };
    const now = new Date();
    const fs = new Date(now.getFullYear(), now.getMonth() - navOffset, 1, 0, 0, 0, 0);
    const fe = new Date(now.getFullYear(), now.getMonth() - navOffset + 1, 0, 23, 59, 59, 999);
    return { frameStart: fs, frameEnd: fe > now ? now : fe };
  }, [preset, navOffset]);

  // Cuántos meses atrás puede ir el usuario (hasta el mes del primer movimiento)
  const maxNavOffset = useMemo(() => {
    if (movimientos.length === 0) return 0;
    const earliest = new Date(Math.min(...movimientos.map((m) => new Date(m.fecha).getTime())));
    const now = new Date();
    return (now.getFullYear() - earliest.getFullYear()) * 12 + (now.getMonth() - earliest.getMonth());
  }, [movimientos]);

  // Etiqueta del mes actual en navegación
  const monthLabel = useMemo(() => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() - navOffset, 1);
    return d.toLocaleDateString("es", { month: "short", year: "2-digit" });
  }, [navOffset]);

  const fetchMovimientos = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await listMovimientos(token);
      setMovimientos(Array.isArray(res.data) ? res.data : []);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchMovimientos(); }, [fetchMovimientos, onRefresh]);

  useEffect(() => {
    if (!token || selectedId === "general") { setReconciliaciones([]); return; }
    listReconciliaciones(token, selectedId)
      .then((r) => setReconciliaciones(Array.isArray(r.data) ? r.data : []))
      .catch(() => setReconciliaciones([]));
  }, [token, selectedId]);

  const serie = useMemo(
    () => buildSerie(cuentas, movimientos, selectedId, windowDays, reconciliaciones, frameStart, frameEnd),
    [cuentas, movimientos, selectedId, windowDays, reconciliaciones, frameStart, frameEnd]
  );

  const minSaldo = serie.length > 0 ? Math.min(...serie.map((p) => p.saldo)) : 0;
  const effectiveDays = frameStart && frameEnd
    ? Math.ceil((frameEnd.getTime() - frameStart.getTime()) / 86_400_000)
    : windowDays;
  const gran = granularityFor(effectiveDays);

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      {/* Header: título + selector de cuenta + presets */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between flex-wrap">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-sm">Evolución del balance</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Selector de cuenta */}
          <select
            value={selectedId}
            onChange={(e) => {
              const v = e.target.value;
              setSelectedId(v === "general" ? "general" : Number(v));
            }}
            className="text-sm bg-background border rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="general">Balance General</option>
            {cuentas.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>

          {/* Presets de ventana */}
          <div className="flex items-center rounded-md border overflow-hidden">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => { setNavOffset(0); setPreset(p.key); }}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  preset === p.key
                    ? "bg-brand-1 text-white"
                    : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Navegación mensual (solo visible con preset 1M) */}
          {preset === "1M" && (
            <div className="flex items-center rounded-md border overflow-hidden text-xs">
              <button
                onClick={() => setNavOffset((n) => Math.min(n + 1, maxNavOffset))}
                disabled={navOffset >= maxNavOffset}
                className="px-2 py-1.5 hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Mes anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 font-medium min-w-[62px] text-center text-muted-foreground">
                {monthLabel}
              </span>
              <button
                onClick={() => setNavOffset((n) => Math.max(0, n - 1))}
                disabled={navOffset === 0}
                className="px-2 py-1.5 hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Mes siguiente"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Gráfica */}
      {loading ? (
        <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">
          Cargando...
        </div>
      ) : serie.length <= 1 ? (
        <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">
          Sin movimientos en este período.
        </div>
      ) : (
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={serie} margin={{ top: 8, right: 8, bottom: 20, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridStroke} />
              <XAxis
                dataKey="ts"
                type="number"
                scale="time"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(ts: number) => fmtLabel(new Date(ts), gran)}
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tick={chartAxisTick}
                dy={6}
                minTickGap={28}
              />
              <YAxis
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tick={chartAxisTick}
                tickFormatter={(v) => formatCurrency(v)}
                width={80}
              />
              {minSaldo < 0 && (
                <ReferenceLine y={0} stroke="var(--destructive)" strokeDasharray="4 2" />
              )}
              <Tooltip
                contentStyle={chartTooltipStyle}
                itemStyle={{ color: "var(--popover-foreground)" }}
                labelStyle={{ color: "var(--muted-foreground)", marginBottom: 4 }}
                cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1, strokeDasharray: "4 2" }}
                labelFormatter={(ts: unknown) =>
                  new Date(ts as number).toLocaleDateString("es", { day: "2-digit", month: "short", year: "2-digit" })
                }
                formatter={(value: unknown, _name: unknown, props: any) => [
                  formatCurrency(Number(value)),
                  props?.payload?.esAjuste ? "Ajuste de conciliación" : "Saldo",
                ]}
              />
              <Line
                type="monotone"
                dataKey="saldo"
                stroke="var(--brand-1)"
                strokeWidth={2.5}
                dot={{ r: 2, fill: "var(--brand-1)", stroke: "var(--background)", strokeWidth: 1.5 }}
                activeDot={{ r: 5, fill: "var(--brand-1)", stroke: "var(--background)", strokeWidth: 2 }}
                isAnimationActive={false}
              />
              {/* Puntos naranjas para ajustes de conciliación — separados del Line
                  para no interferir con el tracking del tooltip de Recharts */}
              {serie.filter((p) => p.esAjuste).map((p) => (
                <ReferenceDot
                  key={p.ts}
                  x={p.ts}
                  y={p.saldo}
                  r={5}
                  fill="var(--chart-4)"
                  stroke="var(--background)"
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <p className="xs text-muted-foreground">
        {gran === "mes" && "Datos agrupados por mes. "}
        {gran === "semana" && "Datos agrupados por semana. "}
        Los puntos naranjas son ajustes de conciliación.
        {selectedId !== "general" && " Las marcas ✓ son saldos conciliados."}
      </p>
    </div>
  );
}
