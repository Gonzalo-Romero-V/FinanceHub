"use client";

import { CheckCircle2, Clock, AlertCircle, Info } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import {
  SISTEMA_LABELS,
  type Deuda,
  type Cuota,
} from "@/lib/api/deudas";
import { formatCurrency, formatDate, todayIsoDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

function sistemaBadgeClass(sistema: string) {
  if (sistema === "frances") return "bg-brand-1/10 text-brand-1";
  if (sistema === "aleman") return "bg-chart-2/10 text-chart-2";
  return "bg-chart-4/10 text-chart-4";
}

function estadoBadgeClass(estado: string) {
  if (estado === "pagada") return "bg-chart-3/10 text-chart-3";
  if (estado === "cancelada") return "bg-muted text-muted-foreground";
  return "bg-muted/50 text-muted-foreground";
}

function KpiMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 p-3 rounded-xl bg-muted/30 border border-border">
      <p className="xs text-muted-foreground">{label}</p>
      <p className="small font-semibold tabular-nums">{value}</p>
    </div>
  );
}

interface DeudaDetailModalProps {
  deuda: Deuda;
  onClose: () => void;
  onPagarCuota: (cuota: Cuota) => void;
}

export function DeudaDetailModal({ deuda, onClose, onPagarCuota }: DeudaDetailModalProps) {
  const hoy = todayIsoDate();
  const hasDesglose = deuda.cuotas.some((c) => c.capital !== null);
  const interesTotal = deuda.total_a_pagar - deuda.monto_original;

  return (
    <Modal open onClose={onClose} title={deuda.nombre} size="xl">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 flex-wrap -mt-1">
          <span className={cn("xs font-semibold px-2 py-0.5 rounded-md uppercase tracking-wide", sistemaBadgeClass(deuda.sistema))}>
            {SISTEMA_LABELS[deuda.sistema]}
          </span>
          {deuda.acreedor && (
            <span className="xs text-muted-foreground">
              Acreedor: <span className="font-medium text-foreground">{deuda.acreedor}</span>
            </span>
          )}
          <span className={cn("xs font-semibold px-2 py-0.5 rounded-md ml-auto capitalize", estadoBadgeClass(deuda.estado))}>
            {deuda.estado}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <KpiMini label="Capital original" value={formatCurrency(deuda.monto_original)} />
          <KpiMini label="Total a pagar" value={formatCurrency(deuda.total_a_pagar)} />
          <KpiMini label="Interés total" value={formatCurrency(interesTotal)} />
          <KpiMini label="Plazo" value={`${deuda.plazo_meses} mes${deuda.plazo_meses !== 1 ? "es" : ""}`} />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between small">
            <span className="text-muted-foreground">
              {deuda.cuotas_pagadas} de {deuda.total_cuotas} cuotas pagadas
            </span>
            <span className="font-semibold text-brand-1">{deuda.progreso_pct}%</span>
          </div>
          <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-brand-1 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(deuda.progreso_pct, 100)}%` }}
            />
          </div>
          <p className="xs text-muted-foreground">
            Saldo pendiente:{" "}
            <span className="font-medium text-foreground">{formatCurrency(deuda.saldo_pendiente)}</span>
          </p>
        </div>

        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-y-auto max-h-[45vh] overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 sticky top-0 z-10">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground">#</th>
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Vencimiento</th>
                  <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Cuota</th>
                  {hasDesglose && (
                    <>
                      <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Capital</th>
                      <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Interés</th>
                    </>
                  )}
                  <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Saldo</th>
                  <th className="text-center px-3 py-2 font-semibold text-muted-foreground">Estado</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {deuda.cuotas.map((cuota) => {
                  const vencida = !cuota.pagada && cuota.fecha_vencimiento < hoy;
                  return (
                    <tr
                      key={cuota.id}
                      className={cn(
                        "border-t border-border/60 transition-colors",
                        cuota.pagada && "opacity-50 bg-chart-3/5",
                        vencida && "bg-destructive/5",
                      )}
                    >
                      <td className="px-3 py-2 tabular-nums text-muted-foreground">{cuota.numero_cuota}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{formatDate(cuota.fecha_vencimiento)}</td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums">{formatCurrency(cuota.cuota_total)}</td>
                      {hasDesglose && (
                        <>
                          <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                            {cuota.capital !== null ? formatCurrency(cuota.capital) : "—"}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                            {cuota.interes !== null ? formatCurrency(cuota.interes) : "—"}
                          </td>
                        </>
                      )}
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                        {formatCurrency(cuota.saldo_restante)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {cuota.pagada ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-chart-3 inline-block" />
                        ) : vencida ? (
                          <AlertCircle className="h-3.5 w-3.5 text-destructive inline-block" />
                        ) : (
                          <Clock className="h-3.5 w-3.5 text-muted-foreground inline-block" />
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {!cuota.pagada && (
                          <button
                            type="button"
                            onClick={() => onPagarCuota(cuota)}
                            className="px-2 py-1 rounded-lg text-xs font-medium border border-brand-1/30 text-brand-1 hover:bg-brand-1/10 transition-colors whitespace-nowrap"
                          >
                            Pagar
                          </button>
                        )}
                        {cuota.pagada && cuota.fecha_pago && (
                          <span className="text-muted-foreground/60 tabular-nums">
                            {formatDate(cuota.fecha_pago)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {deuda.interes_implicito !== null && deuda.interes_implicito > 0 && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-muted/30 border border-border">
            <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="xs text-muted-foreground">
              Interés implícito:{" "}
              <span className="font-medium text-foreground">{formatCurrency(deuda.interes_implicito)}</span>
              {deuda.monto_original > 0 && (
                <> ({((deuda.interes_implicito / deuda.monto_original) * 100).toFixed(1)}% del capital)</>
              )}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
