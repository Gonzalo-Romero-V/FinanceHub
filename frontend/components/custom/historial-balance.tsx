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

interface CuentaConSaldo {
  id: number;
  nombre: string;
  saldo_inicial: number;
}

interface HistorialBalanceProps {
  cuentas: CuentaConSaldo[];
  onRefresh?: number;
}

interface DataPoint {
  fecha: string;
  saldo: number;
  esAjuste?: boolean;
}

function computeSerieGeneral(
  cuentas: CuentaConSaldo[],
  movimientos: MovimientoRaw[]
): DataPoint[] {
  const saldoBase = cuentas.reduce((acc, c) => acc + (c.saldo_inicial ?? 0), 0);
  const sorted = [...movimientos].sort(
    (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
  );

  let running = saldoBase;
  const points: DataPoint[] = [{ fecha: "Inicio", saldo: running }];

  for (const m of sorted) {
    const tipo = m.concepto?.tipo_movimiento?.nombre ?? m.concepto?.tipoMovimiento?.nombre;
    if (tipo === "Ingreso") running += Number(m.monto);
    else if (tipo === "Egreso") running -= Number(m.monto);
    // Transferencias no cambian el patrimonio total

    const fecha = new Date(m.fecha).toLocaleDateString("es", {
      day: "2-digit",
      month: "short",
    });
    const esAjuste = m.concepto?.nombre?.toLowerCase().includes("ajuste");
    points.push({ fecha, saldo: Math.round(running * 100) / 100, esAjuste });
  }

  return points;
}

function computeSerieCuenta(
  cuenta: CuentaConSaldo,
  movimientos: MovimientoRaw[],
  reconciliaciones: Reconciliacion[]
): DataPoint[] {
  const filtered = movimientos
    .filter(
      (m) => m.cuenta_origen_id === cuenta.id || m.cuenta_destino_id === cuenta.id
    )
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

  let running = cuenta.saldo_inicial ?? 0;
  const points: DataPoint[] = [{ fecha: "Inicio", saldo: running }];

  for (const m of filtered) {
    if (m.cuenta_destino_id === cuenta.id) running += Number(m.monto);
    else if (m.cuenta_origen_id === cuenta.id) running -= Number(m.monto);

    const fecha = new Date(m.fecha).toLocaleDateString("es", {
      day: "2-digit",
      month: "short",
    });
    const esAjuste = m.concepto?.nombre?.toLowerCase().includes("ajuste");
    points.push({ fecha, saldo: Math.round(running * 100) / 100, esAjuste });
  }

  // Añadir puntos de reconciliación verificados
  for (const r of reconciliaciones) {
    const fecha = new Date(r.fecha).toLocaleDateString("es", {
      day: "2-digit",
      month: "short",
    });
    points.push({ fecha: `✓ ${fecha}`, saldo: r.saldo_real });
  }

  return points;
}

export function HistorialBalance({ cuentas, onRefresh }: HistorialBalanceProps) {
  const { token } = useAuth();
  const [movimientos, setMovimientos] = useState<MovimientoRaw[]>([]);
  const [reconciliaciones, setReconciliaciones] = useState<Reconciliacion[]>([]);
  const [selectedCuentaId, setSelectedCuentaId] = useState<"general" | number>("general");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [movRes] = await Promise.all([listMovimientos(token)]);
      setMovimientos(Array.isArray(movRes.data) ? movRes.data : []);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData, onRefresh]);

  // Cuando se selecciona una cuenta específica, cargamos sus reconciliaciones
  useEffect(() => {
    if (!token || selectedCuentaId === "general") {
      setReconciliaciones([]);
      return;
    }
    listReconciliaciones(token, selectedCuentaId)
      .then((r) => setReconciliaciones(Array.isArray(r.data) ? r.data : []))
      .catch(() => setReconciliaciones([]));
  }, [token, selectedCuentaId]);

  const serie = useMemo(() => {
    if (selectedCuentaId === "general") {
      return computeSerieGeneral(cuentas, movimientos);
    }
    const cuenta = cuentas.find((c) => c.id === selectedCuentaId);
    if (!cuenta) return [];
    return computeSerieCuenta(cuenta, movimientos, reconciliaciones);
  }, [selectedCuentaId, cuentas, movimientos, reconciliaciones]);

  const minSaldo = useMemo(
    () => Math.min(...serie.map((p) => p.saldo)),
    [serie]
  );

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-sm">Evolución del balance</span>
        </div>

        <select
          value={selectedCuentaId}
          onChange={(e) => {
            const v = e.target.value;
            setSelectedCuentaId(v === "general" ? "general" : Number(v));
          }}
          className="text-sm bg-background border rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="general">Balance General</option>
          {cuentas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">
          Cargando...
        </div>
      ) : serie.length <= 1 ? (
        <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">
          Sin movimientos registrados aún.
        </div>
      ) : (
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={serie} margin={{ top: 8, right: 8, bottom: 20, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridStroke} />
              <XAxis
                dataKey="fecha"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tick={chartAxisTick}
                dy={6}
                minTickGap={24}
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
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  if (payload.esAjuste) {
                    return (
                      <circle
                        key={`dot-${cx}-${cy}`}
                        cx={cx}
                        cy={cy}
                        r={5}
                        fill="var(--chart-4)"
                        stroke="var(--background)"
                        strokeWidth={2}
                      />
                    );
                  }
                  return (
                    <circle
                      key={`dot-${cx}-${cy}`}
                      cx={cx}
                      cy={cy}
                      r={3}
                      fill="var(--chart-2)"
                      stroke="var(--background)"
                      strokeWidth={2}
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
        Los puntos naranjas indican ajustes de conciliación.
        {selectedCuentaId !== "general" && " Las marcas ✓ son saldos verificados."}
      </p>
    </div>
  );
}
