"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { History } from "lucide-react";

import { useAuth } from "@/lib/auth/context";
import { listMovimientos, type MovimientoRaw } from "@/lib/api/movimientos";
import { listReconciliaciones, type Reconciliacion } from "@/lib/api/reconciliaciones";
import { formatCurrency } from "@/lib/utils/format";
import { chartTooltipStyle, chartAxisTick, chartGridStroke } from "@/components/charts/chart-theme";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface CuentaConSaldo {
  id: number;
  nombre: string;
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

// ─── Agregación ──────────────────────────────────────────────────────────────

function aggregate(points: RawPoint[], granularity: "dia" | "semana" | "mes"): DataPoint[] {
  if (granularity === "dia") {
    return points.map((p) => ({
      label: fmtLabel(p.fecha, "dia"),
      saldo: p.saldo,
      esAjuste: p.esAjuste,
    }));
  }

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
  reconciliaciones: Reconciliacion[]
): DataPoint[] {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const cutoff = windowDays
    ? new Date(today.getTime() - windowDays * 86400000)
    : null;

  const sorted = [...movimientos].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

  // ── Computar saldo inicial de la ventana ──────────────────────────────────
  let startingSaldo: number;

  if (selectedId === "general") {
    startingSaldo = cuentas.reduce((s, c) => s + (c.saldo_inicial ?? 0), 0);
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
  const inWindow = sorted.filter((m) => !cutoff || new Date(m.fecha) >= cutoff);

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

  // ── Punto sintético de hoy ────────────────────────────────────────────────
  // Añadir saldo actual como punto final para que la línea llegue a hoy
  const currentSaldo = selectedId === "general"
    ? cuentas.reduce((s, c) => s + (c.saldo ?? 0), 0)
    : (cuentas.find((c) => c.id === selectedId)?.saldo ?? running);

  const lastTs = rawPoints.length > 0 ? rawPoints[rawPoints.length - 1].ts : 0;
  const todayTs = new Date().setHours(12, 0, 0, 0);
  if (todayTs - lastTs > 3600000) { // más de 1h de diferencia → añadir punto de hoy
    rawPoints.push({
      ts: todayTs,
      fecha: new Date(todayTs),
      saldo: Math.round(Number(currentSaldo) * 100) / 100,
    });
  }

  // ── Añadir puntos de conciliación verificados (solo vista por cuenta) ──────
  if (selectedId !== "general") {
    for (const r of reconciliaciones) {
      const fecha = new Date(r.fecha);
      if (cutoff && fecha < cutoff) continue;
      rawPoints.push({ ts: fecha.getTime(), fecha, saldo: r.saldo_real });
    }
    rawPoints.sort((a, b) => a.ts - b.ts);
  }

  // ── Agregar según granularidad ────────────────────────────────────────────
  const gran = granularityFor(windowDays);
  return aggregate(rawPoints, gran);
}

// ─── Componente ──────────────────────────────────────────────────────────────

export function HistorialBalance({ cuentas, onRefresh }: HistorialBalanceProps) {
  const { token } = useAuth();
  const [movimientos, setMovimientos] = useState<MovimientoRaw[]>([]);
  const [reconciliaciones, setReconciliaciones] = useState<Reconciliacion[]>([]);
  const [selectedId, setSelectedId] = useState<"general" | number>("general");
  const [preset, setPreset] = useState<Preset>("3M");
  const [loading, setLoading] = useState(true);

  const windowDays = PRESETS.find((p) => p.key === preset)?.days ?? 90;

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
    () => buildSerie(cuentas, movimientos, selectedId, windowDays, reconciliaciones),
    [cuentas, movimientos, selectedId, windowDays, reconciliaciones]
  );

  const minSaldo = serie.length > 0 ? Math.min(...serie.map((p) => p.saldo)) : 0;

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
                onClick={() => setPreset(p.key)}
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
                dataKey="label"
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
                formatter={(value: unknown) => [formatCurrency(Number(value)), "Saldo"]}
              />
              <Line
                type="monotone"
                dataKey="saldo"
                stroke="var(--chart-2)"
                strokeWidth={2.5}
                dot={(props: any) => {
                  const { cx, cy, payload } = props;
                  if (payload.esAjuste) {
                    return (
                      <circle
                        key={`dot-${cx}-${cy}`}
                        cx={cx} cy={cy} r={5}
                        fill="var(--chart-4)"
                        stroke="var(--background)"
                        strokeWidth={2}
                      />
                    );
                  }
                  return (
                    <circle
                      key={`dot-${cx}-${cy}`}
                      cx={cx} cy={cy} r={2}
                      fill="var(--chart-2)"
                      stroke="var(--background)"
                      strokeWidth={1.5}
                    />
                  );
                }}
                activeDot={{ r: 5, strokeWidth: 0 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <p className="xs text-muted-foreground">
        {granularityFor(windowDays) === "mes" && "Datos agrupados por mes. "}
        {granularityFor(windowDays) === "semana" && "Datos agrupados por semana. "}
        Los puntos naranjas son ajustes de conciliación.
        {selectedId !== "general" && " Las marcas ✓ son saldos conciliados."}
      </p>
    </div>
  );
}
