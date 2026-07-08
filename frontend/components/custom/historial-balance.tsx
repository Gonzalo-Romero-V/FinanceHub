"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  ComposedChart,
  CartesianGrid,
  Legend,
  Line,
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
import {
  chartTooltipStyle,
  chartAxisTick,
  chartGridStroke,
  chartCategoricalColors,
} from "@/components/charts/chart-theme";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface CuentaConSaldo {
  id: number;
  nombre: string;
  tipo_cuenta: string;
  saldo_inicial: number;
  saldo: number;
  fecha_creacion?: string;
  color?: string | null;
}

interface HistorialBalanceProps {
  cuentas: CuentaConSaldo[];
  onRefresh?: number;
}

interface RawPoint {
  ts: number;
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

interface MultiPoint {
  ts: number;
  [key: string]: number | null;
}

type Vista = "general" | "todas" | number;

// ─── Presets ──────────────────────────────────────────────────────────────────

type Preset = "1M" | "3M" | "6M" | "1A" | "Todo";

const PRESETS: { key: Preset; label: string; days: number | null }[] = [
  { key: "1M",   label: "1M",   days: 30   },
  { key: "3M",   label: "3M",   days: 90   },
  { key: "6M",   label: "6M",   days: 180  },
  { key: "1A",   label: "1A",   days: 365  },
  { key: "Todo", label: "Todo", days: null },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtLabel(date: Date, gran: "dia" | "mes"): string {
  if (gran === "mes") return date.toLocaleDateString("es", { month: "short", year: "2-digit" });
  return date.toLocaleDateString("es", { day: "2-digit", month: "short" });
}

// Granularidad de las etiquetas del eje X (no afecta la resolución de los datos,
// que siempre es diaria — ver fillDailyData/buildMultiSerie).
function granularityFor(days: number): "dia" | "mes" {
  return days > 365 ? "mes" : "dia";
}

function getTipo(m: MovimientoRaw): string {
  return (m.concepto as any)?.tipo_movimiento?.nombre
    ?? (m.concepto as any)?.tipoMovimiento?.nombre
    ?? "";
}

function parseFecha(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function accountKey(id: number): string {
  return `cta_${id}`;
}

// ─── Relleno diario ───────────────────────────────────────────────────────────
// Genera un DataPoint por cada día del rango, con el saldo llevado hacia
// adelante desde el último movimiento conocido. Se usa SIEMPRE (para todas
// las granularidades) para que el tooltip sea continuo en toda ventana de
// tiempo, igual que en la vista de 3 meses: hay un punto por día, por lo que
// el cursor siempre engancha al día más cercano en vez de saltar entre
// agregados semanales/mensuales dispersos.

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

// ─── buildSerie (Balance General / cuenta individual) ─────────────────────────

function buildSerie(
  cuentas: CuentaConSaldo[],
  movimientos: MovimientoRaw[],
  selectedId: "general" | number,
  windowDays: number | null,
  reconciliaciones: Reconciliacion[],
  frameStart: Date | null,
  frameEnd: Date | null,
): { data: DataPoint[]; gran: "dia" | "mes" } {

  const realNow = new Date();
  const frameEndEff = frameEnd
    ?? new Date(realNow.getFullYear(), realNow.getMonth(), realNow.getDate(), 23, 59, 59, 999);

  // El "día uno" real nunca puede ser anterior a la fecha de creación de la
  // cuenta (o de la más antigua, en balance general): antes de esa fecha no
  // hay datos reales, así que no se puede inventar/rellenar hacia atrás.
  const earliestReal = selectedId === "general"
    ? cuentas.reduce<Date | null>((min, c) => {
        const fc = parseFecha(c.fecha_creacion);
        if (!fc) return min;
        return !min || fc < min ? fc : min;
      }, null)
    : parseFecha(cuentas.find((c) => c.id === selectedId)?.fecha_creacion);

  const rawCutoff = frameStart
    ? frameStart
    : windowDays
      ? new Date(frameEndEff.getTime() - windowDays * 86_400_000)
      : null;

  const cutoff = earliestReal && (rawCutoff === null || rawCutoff.getTime() < earliestReal.getTime())
    ? earliestReal
    : rawCutoff;

  const sorted = [...movimientos].sort(
    (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
  );

  // ── Saldo al inicio de la ventana ─────────────────────────────────────────
  let startingSaldo = 0;

  if (selectedId === "general") {
    const activos = cuentas.filter((c) => c.tipo_cuenta === "Activo");
    const pasivos = cuentas.filter((c) => c.tipo_cuenta === "Pasivo");
    startingSaldo =
      activos.reduce((s, c) => s + (c.saldo_inicial ?? 0), 0) -
      pasivos.reduce((s, c) => s + (c.saldo_inicial ?? 0), 0);
    for (const m of sorted) {
      if (!cutoff || new Date(m.fecha).getTime() >= cutoff.getTime()) break;
      const t = getTipo(m);
      if (t === "Ingreso") startingSaldo += Number(m.monto);
      else if (t === "Egreso") startingSaldo -= Number(m.monto);
    }
  } else {
    const cuenta = cuentas.find((c) => c.id === selectedId);
    if (!cuenta) return { data: [], gran: "dia" };
    startingSaldo = cuenta.saldo_inicial ?? 0;
    for (const m of sorted) {
      if (!cutoff || new Date(m.fecha).getTime() >= cutoff.getTime()) break;
      if (m.cuenta_destino_id === selectedId) startingSaldo += Number(m.monto);
      else if (m.cuenta_origen_id === selectedId) startingSaldo -= Number(m.monto);
    }
  }

  // ── Movimientos dentro de la ventana ──────────────────────────────────────
  const inWindow = sorted.filter((m) => {
    const d = new Date(m.fecha);
    if (cutoff && d < cutoff) return false;
    if (d > frameEndEff) return false;
    return true;
  });

  // ── Construir rawPoints ───────────────────────────────────────────────────
  const rawPoints: RawPoint[] = [];
  const startDate = cutoff ?? (inWindow.length > 0 ? new Date(inWindow[0].fecha) : new Date());
  rawPoints.push({
    ts:    startDate.getTime(),
    fecha: startDate,
    saldo: Math.round(startingSaldo * 100) / 100,
  });

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
      ts:       fecha.getTime(),
      fecha,
      saldo:    Math.round(running * 100) / 100,
      esAjuste: (m.concepto as any)?.nombre?.toLowerCase().includes("ajuste"),
    });
  }

  // ── Puntos de conciliación ────────────────────────────────────────────────
  if (selectedId !== "general") {
    for (const r of reconciliaciones) {
      const fecha = new Date(r.fecha);
      if (cutoff && fecha < cutoff) continue;
      if (fecha > frameEndEff) continue;
      rawPoints.push({ ts: fecha.getTime(), fecha, saldo: r.saldo_real });
    }
    rawPoints.sort((a, b) => a.ts - b.ts);
  }

  // ── Punto final anclado al saldo real ─────────────────────────────────────
  const todayMidnight = new Date().setHours(0, 0, 0, 0);
  const isPastFrame   = frameEnd !== null && frameEnd.getTime() < todayMidnight;

  const currentSaldo = selectedId === "general"
    ? cuentas.filter((c) => c.tipo_cuenta === "Activo").reduce((s, c) => s + (c.saldo ?? 0), 0) -
      cuentas.filter((c) => c.tipo_cuenta === "Pasivo").reduce((s, c) => s + (c.saldo ?? 0), 0)
    : (cuentas.find((c) => c.id === selectedId)?.saldo ?? running);

  const endSaldo  = isPastFrame ? running : currentSaldo;
  const realSaldo = Math.round(Number(endSaldo) * 100) / 100;
  const endTs     = isPastFrame
    ? new Date(frameEndEff).setHours(12, 0, 0, 0)
    : todayMidnight + 43_200_000;
  const endDayStart = isPastFrame
    ? new Date(frameEndEff).setHours(0, 0, 0, 0)
    : todayMidnight;
  const lastRaw = rawPoints[rawPoints.length - 1];

  if (lastRaw && lastRaw.ts >= endDayStart) {
    rawPoints[rawPoints.length - 1] = { ...lastRaw, saldo: realSaldo };
  } else {
    rawPoints.push({ ts: endTs, fecha: new Date(endTs), saldo: realSaldo });
  }

  // ── Granularidad de las etiquetas del eje X ───────────────────────────────
  const spanDays = rawPoints.length > 1
    ? (rawPoints[rawPoints.length - 1].ts - rawPoints[0].ts) / 86_400_000
    : 1;

  const effectiveDays = frameStart && frameEnd
    ? Math.ceil((frameEnd.getTime() - frameStart.getTime()) / 86_400_000)
    : windowDays !== null
      ? windowDays
      : spanDays;

  const gran = granularityFor(effectiveDays);

  return { data: fillDailyData(rawPoints), gran };
}

// ─── buildMultiSerie (todas las cuentas, una línea por cuenta) ────────────────

function buildMultiSerie(
  cuentas: CuentaConSaldo[],
  movimientos: MovimientoRaw[],
  windowDays: number | null,
  frameStart: Date | null,
  frameEnd: Date | null,
): { data: MultiPoint[]; series: { id: number; nombre: string; key: string }[]; gran: "dia" | "mes" } {

  const realNow = new Date();
  const frameEndEff = frameEnd
    ?? new Date(realNow.getFullYear(), realNow.getMonth(), realNow.getDate(), 23, 59, 59, 999);

  const cuentasConFecha = cuentas
    .map((c) => ({ cuenta: c, creada: parseFecha(c.fecha_creacion) }))
    .filter((x): x is { cuenta: CuentaConSaldo; creada: Date } => x.creada !== null);

  if (cuentasConFecha.length === 0) return { data: [], series: [], gran: "dia" };

  const rawCutoff = frameStart
    ? frameStart
    : windowDays
      ? new Date(frameEndEff.getTime() - windowDays * 86_400_000)
      : null;

  const earliestCreada = new Date(Math.min(...cuentasConFecha.map((x) => x.creada.getTime())));
  const globalStart = rawCutoff && rawCutoff.getTime() > earliestCreada.getTime() ? rawCutoff : earliestCreada;

  const ONE_DAY = 86_400_000;
  const startTs = new Date(globalStart).setHours(0, 0, 0, 0);
  const endTs   = new Date(frameEndEff).setHours(0, 0, 0, 0);
  if (startTs > endTs) return { data: [], series: [], gran: "dia" };

  const todayMidnight = new Date().setHours(0, 0, 0, 0);
  const isPastFrame = frameEnd !== null && frameEnd.getTime() < todayMidnight;

  const sorted = [...movimientos].sort(
    (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
  );

  const perAccount = cuentasConFecha.map(({ cuenta, creada }) => {
    const creadaTs = Math.max(new Date(creada).setHours(0, 0, 0, 0), startTs);
    const propios = sorted.filter(
      (m) => m.cuenta_origen_id === cuenta.id || m.cuenta_destino_id === cuenta.id
    );

    let running = cuenta.saldo_inicial ?? 0;
    let mIdx = 0;

    // Acumula, sin generar puntos, todos los movimientos previos al arranque
    // de la ventana visible (misma lógica que buildSerie: el saldo de partida
    // debe reflejar la historia real de la cuenta, no empezar de cero).
    while (mIdx < propios.length && new Date(propios[mIdx].fecha).getTime() < creadaTs) {
      const m = propios[mIdx];
      if (m.cuenta_destino_id === cuenta.id) running += Number(m.monto);
      else if (m.cuenta_origen_id === cuenta.id) running -= Number(m.monto);
      mIdx++;
    }

    const dailySaldo = new Map<number, number>();
    for (let t = creadaTs; t <= endTs; t += ONE_DAY) {
      const dayEnd = t + ONE_DAY - 1;
      while (mIdx < propios.length && new Date(propios[mIdx].fecha).getTime() <= dayEnd) {
        const m = propios[mIdx];
        if (m.cuenta_destino_id === cuenta.id) running += Number(m.monto);
        else if (m.cuenta_origen_id === cuenta.id) running -= Number(m.monto);
        mIdx++;
      }
      dailySaldo.set(t, Math.round(running * 100) / 100);
    }

    if (!isPastFrame && dailySaldo.has(todayMidnight)) {
      dailySaldo.set(todayMidnight, Math.round(Number(cuenta.saldo) * 100) / 100);
    }

    return { cuenta, key: accountKey(cuenta.id), dailySaldo };
  });

  const effectiveDays = frameStart && frameEnd
    ? Math.ceil((frameEnd.getTime() - frameStart.getTime()) / ONE_DAY)
    : windowDays ?? Math.ceil((endTs - startTs) / ONE_DAY);
  const gran = granularityFor(effectiveDays);

  const data: MultiPoint[] = [];
  for (let t = startTs; t <= endTs; t += ONE_DAY) {
    const point: MultiPoint = { ts: t };
    for (const { key, dailySaldo } of perAccount) {
      point[key] = dailySaldo.get(t) ?? null;
    }
    data.push(point);
  }

  return {
    data,
    series: perAccount.map(({ cuenta, key }) => ({ id: cuenta.id, nombre: cuenta.nombre, key })),
    gran,
  };
}

// ─── Tooltip multi-cuenta ──────────────────────────────────────────────────────

interface MultiTooltipPayloadItem {
  dataKey: string;
  value?: number | null;
  color?: string;
}

interface MultiTooltipProps {
  active?: boolean;
  payload?: readonly MultiTooltipPayloadItem[];
  label?: number;
  series: { id: number; nombre: string; key: string }[];
}

function MultiTooltip({ active, payload, label, series }: MultiTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const items = payload.filter(
    (p): p is MultiTooltipPayloadItem & { value: number } => typeof p.value === "number"
  );
  if (items.length === 0) return null;

  return (
    <div style={chartTooltipStyle}>
      <div style={{ color: "var(--muted-foreground)", marginBottom: 6, fontSize: 12 }}>
        {new Date(label as number).toLocaleDateString("es", { day: "2-digit", month: "short", year: "2-digit" })}
      </div>
      <div className="space-y-1">
        {items
          .sort((a, b) => b.value - a.value)
          .map((p) => {
            const nombre = series.find((s) => s.key === p.dataKey)?.nombre ?? p.dataKey;
            return (
              <div key={p.dataKey} className="flex items-center justify-between gap-4 text-xs" style={{ color: "var(--popover-foreground)" }}>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full" style={{ background: p.color }} />
                  {nombre}
                </span>
                <span>{formatCurrency(p.value)}</span>
              </div>
            );
          })}
      </div>
    </div>
  );
}

// ─── Componente ──────────────────────────────────────────────────────────────

export function HistorialBalance({ cuentas, onRefresh }: HistorialBalanceProps) {
  const { token } = useAuth();
  const [movimientos, setMovimientos] = useState<MovimientoRaw[]>([]);
  const [reconciliaciones, setReconciliaciones] = useState<Reconciliacion[]>([]);
  const [selectedId, setSelectedId] = useState<Vista>("general");
  const [preset, setPreset] = useState<Preset>("3M");
  const [navOffset, setNavOffset] = useState(0);
  const [loading, setLoading] = useState(true);

  const isMulti = selectedId === "todas";

  const cuentaColorById = useMemo(() => {
    const map: Record<number, string> = {};
    for (const c of cuentas) {
      if (c.color) map[c.id] = c.color;
    }
    return map;
  }, [cuentas]);

  const windowDays: number | null = PRESETS.find((p) => p.key === preset)?.days ?? null;

  // ── Frame para navegación mensual ─────────────────────────────────────────
  const { frameStart, frameEnd } = useMemo(() => {
    if (preset !== "1M") return { frameStart: null, frameEnd: null };
    const now = new Date();
    const fs = new Date(now.getFullYear(), now.getMonth() - navOffset, 1, 0, 0, 0, 0);
    const fe = new Date(now.getFullYear(), now.getMonth() - navOffset + 1, 0, 23, 59, 59, 999);
    return { frameStart: fs, frameEnd: fe > now ? now : fe };
  }, [preset, navOffset]);

  const maxNavOffset = useMemo(() => {
    if (movimientos.length === 0) return 0;
    const earliest = new Date(Math.min(...movimientos.map((m) => new Date(m.fecha).getTime())));
    const now = new Date();
    return (now.getFullYear() - earliest.getFullYear()) * 12 + (now.getMonth() - earliest.getMonth());
  }, [movimientos]);

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
    if (!token || typeof selectedId !== "number") { setReconciliaciones([]); return; }
    listReconciliaciones(token, selectedId)
      .then((r) => setReconciliaciones(Array.isArray(r.data) ? r.data : []))
      .catch(() => setReconciliaciones([]));
  }, [token, selectedId]);

  const single = useMemo(
    () => (isMulti
      ? { data: [] as DataPoint[], gran: "dia" as const }
      : buildSerie(cuentas, movimientos, selectedId as "general" | number, windowDays, reconciliaciones, frameStart, frameEnd)
    ),
    [isMulti, cuentas, movimientos, selectedId, windowDays, reconciliaciones, frameStart, frameEnd]
  );

  const multi = useMemo(
    () => (isMulti
      ? buildMultiSerie(cuentas, movimientos, windowDays, frameStart, frameEnd)
      : { data: [] as MultiPoint[], series: [], gran: "dia" as const }
    ),
    [isMulti, cuentas, movimientos, windowDays, frameStart, frameEnd]
  );

  const serie: (DataPoint | MultiPoint)[] = isMulti ? multi.data : single.data;
  const gran = isMulti ? multi.gran : single.gran;
  const isEmpty = isMulti ? multi.series.length === 0 || multi.data.length === 0 : single.data.length <= 1;

  const minSaldo = useMemo(() => {
    if (isMulti) {
      const vals = multi.data.flatMap((p) =>
        multi.series.map((s) => p[s.key]).filter((v): v is number => typeof v === "number")
      );
      return vals.length ? Math.min(...vals) : 0;
    }
    return single.data.length > 0 ? Math.min(...single.data.map((p) => p.saldo)) : 0;
  }, [isMulti, multi, single]);

  // Dots solo para vistas de una sola serie con pocos puntos.
  const showDots = !isMulti && single.data.length <= 20;

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between flex-wrap">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-sm">Evolución del balance</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedId}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "general" || v === "todas") setSelectedId(v);
              else setSelectedId(Number(v));
            }}
            className="text-sm bg-background border rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="general">Balance General</option>
            <option value="todas">Cuentas individuales (comparar)</option>
            {cuentas.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>

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
        <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">
          Cargando...
        </div>
      ) : isEmpty ? (
        <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">
          Sin movimientos en este período.
        </div>
      ) : (
        <div className={isMulti ? "h-64 w-full" : "h-56 w-full"}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={serie} margin={{ top: 8, right: 8, bottom: isMulti ? 4 : 20, left: 8 }}>
              <defs>
                <linearGradient id="gradBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="var(--brand-1)" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="var(--brand-1)" stopOpacity={0}    />
                </linearGradient>
              </defs>

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
                minTickGap={32}
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

              {isMulti ? (
                <Tooltip
                  content={(props) => <MultiTooltip {...(props as unknown as Omit<MultiTooltipProps, "series">)} series={multi.series} />}
                  cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1, strokeDasharray: "4 2" }}
                />
              ) : (
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  itemStyle={{ color: "var(--popover-foreground)" }}
                  labelStyle={{ color: "var(--muted-foreground)", marginBottom: 4 }}
                  cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1, strokeDasharray: "4 2" }}
                  labelFormatter={(ts: unknown) =>
                    new Date(ts as number).toLocaleDateString("es", {
                      day: "2-digit", month: "short", year: "2-digit",
                    })
                  }
                  formatter={(value: unknown, _name: unknown, props: any) => [
                    formatCurrency(Number(value)),
                    props?.payload?.esAjuste ? "Ajuste de conciliación" : "Saldo",
                  ]}
                />
              )}

              {isMulti ? (
                <>
                  {multi.series.map((s, i) => (
                    <Line
                      key={s.key}
                      type="monotone"
                      dataKey={s.key}
                      name={s.key}
                      stroke={cuentaColorById[s.id] ?? chartCategoricalColors[i % chartCategoricalColors.length]}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--background)" }}
                      connectNulls={false}
                      isAnimationActive={false}
                    />
                  ))}
                  <Legend
                    formatter={(value: string) => multi.series.find((s) => s.key === value)?.nombre ?? value}
                    wrapperStyle={{ fontSize: 11, color: "var(--muted-foreground)" }}
                  />
                </>
              ) : (
                <>
                  <Area
                    type="monotone"
                    dataKey="saldo"
                    stroke="var(--brand-1)"
                    strokeWidth={2.5}
                    fill="url(#gradBalance)"
                    dot={showDots
                      ? { r: 3, fill: "var(--brand-1)", stroke: "var(--background)", strokeWidth: 1.5 }
                      : false
                    }
                    activeDot={{ r: 5, fill: "var(--brand-1)", stroke: "var(--background)", strokeWidth: 2 }}
                    isAnimationActive={false}
                  />

                  {/* Puntos naranjas de ajuste de conciliación */}
                  {(single.data as DataPoint[]).filter((p) => p.esAjuste).map((p) => (
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
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {isMulti
          ? "Cada línea es el saldo de una cuenta. Una línea empieza a dibujarse recién en la fecha de creación real de esa cuenta."
          : <>
              Los puntos naranjos son ajustes de conciliación.
              {selectedId !== "general" && " Las marcas ✓ son saldos conciliados."}
            </>
        }
      </p>
    </div>
  );
}
