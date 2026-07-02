"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TrendingDown,
  Plus,
  Pencil,
  Trash2,
  Eye,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  Info,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { PageShell } from "@/components/custom/page-shell";
import { PageHeader } from "@/components/custom/page-header";
import { PageLoading, PageError } from "@/components/custom/page-state";
import { ConfirmDeleteModal } from "@/components/forms/confirm-delete-modal";
import { DeudaForm } from "@/components/forms/deuda-form";
import { PagoCuotaModal } from "@/components/forms/pago-cuota-modal";

import { useAuth } from "@/lib/auth/context";
import {
  listDeudas,
  deleteDeuda,
  SISTEMA_LABELS,
  type Deuda,
  type Cuota,
} from "@/lib/api/deudas";
import { formatCurrency, formatDate, todayIsoDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

// ─── Helpers de estilo ───────────────────────────────────────────────────────

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

// ─── KPI mini card ───────────────────────────────────────────────────────────

function KpiMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 p-3 rounded-xl bg-muted/30 border border-border">
      <p className="xs text-muted-foreground">{label}</p>
      <p className="small font-semibold tabular-nums">{value}</p>
    </div>
  );
}

// ─── Tabla de amortización (modal detalle) ───────────────────────────────────

function DeudaDetailModal({
  deuda,
  onClose,
  onPagarCuota,
}: {
  deuda: Deuda;
  onClose: () => void;
  onPagarCuota: (cuota: Cuota) => void;
}) {
  const hoy = todayIsoDate();
  const hasDesglose = deuda.cuotas.some((c) => c.capital !== null);
  const interesTotal = deuda.total_a_pagar - deuda.monto_original;

  return (
    <Modal open onClose={onClose} title={deuda.nombre} size="xl">
      <div className="flex flex-col gap-4">
        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap -mt-1">
          <span className={cn("xs font-semibold px-2 py-0.5 rounded-md uppercase tracking-wide", sistemaBadgeClass(deuda.sistema))}>
            {SISTEMA_LABELS[deuda.sistema]}
          </span>
          {deuda.acreedor && (
            <span className="xs text-muted-foreground">Acreedor: <span className="font-medium text-foreground">{deuda.acreedor}</span></span>
          )}
          <span className={cn("xs font-semibold px-2 py-0.5 rounded-md ml-auto capitalize", estadoBadgeClass(deuda.estado))}>
            {deuda.estado}
          </span>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <KpiMini label="Capital original" value={formatCurrency(deuda.monto_original)} />
          <KpiMini label="Total a pagar" value={formatCurrency(deuda.total_a_pagar)} />
          <KpiMini label="Interés total" value={formatCurrency(interesTotal)} />
          <KpiMini label="Plazo" value={`${deuda.plazo_meses} mes${deuda.plazo_meses !== 1 ? "es" : ""}`} />
        </div>

        {/* Barra de progreso */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between small">
            <span className="text-muted-foreground">{deuda.cuotas_pagadas} de {deuda.total_cuotas} cuotas pagadas</span>
            <span className="font-semibold text-brand-1">{deuda.progreso_pct}%</span>
          </div>
          <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-brand-1 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(deuda.progreso_pct, 100)}%` }}
            />
          </div>
          <p className="xs text-muted-foreground">
            Saldo pendiente: <span className="font-medium text-foreground">{formatCurrency(deuda.saldo_pendiente)}</span>
          </p>
        </div>

        {/* Tabla de cuotas */}
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
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{formatCurrency(cuota.saldo_restante)}</td>
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
                          <span className="text-muted-foreground/60 tabular-nums">{formatDate(cuota.fecha_pago)}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Nota sobre interés implícito */}
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

// ─── Tarjeta de deuda ────────────────────────────────────────────────────────

function DeudaCard({
  deuda,
  onEdit,
  onDelete,
  onVerTabla,
  onPagar,
}: {
  deuda: Deuda;
  onEdit: () => void;
  onDelete: () => void;
  onVerTabla: () => void;
  onPagar: (cuota: Cuota) => void;
}) {
  const hoy = todayIsoDate();
  const proximaCuota = deuda.proxima_cuota;
  const hayVencidas = deuda.cuotas.some((c) => !c.pagada && c.fecha_vencimiento < hoy);

  return (
    <div className={cn(
      "flex flex-col gap-4 p-5 rounded-2xl border bg-card transition-opacity",
      deuda.estado !== "activa" && "opacity-60",
    )}>
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("xs font-semibold px-2 py-0.5 rounded-md uppercase tracking-wide", sistemaBadgeClass(deuda.sistema))}>
              {SISTEMA_LABELS[deuda.sistema]}
            </span>
            {deuda.estado !== "activa" && (
              <span className={cn("xs font-semibold px-2 py-0.5 rounded-md capitalize", estadoBadgeClass(deuda.estado))}>
                {deuda.estado}
              </span>
            )}
            {hayVencidas && deuda.estado === "activa" && (
              <span className="xs font-semibold px-2 py-0.5 rounded-md bg-destructive/10 text-destructive">
                Cuotas vencidas
              </span>
            )}
          </div>
          <p className="font-semibold text-foreground truncate">{deuda.nombre}</p>
          {deuda.acreedor && (
            <p className="xs text-muted-foreground">{deuda.acreedor}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onEdit}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            aria-label="Editar"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            aria-label="Eliminar"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Progreso */}
      <div className="flex flex-col gap-2">
        <div className="flex items-end justify-between">
          <div>
            <p className="xs text-muted-foreground mb-0.5">Pagado</p>
            <p className="font-semibold tabular-nums">
              <span className="text-muted-foreground/40 font-normal mr-1">$</span>
              {formatCurrency(deuda.monto_pagado).replace("$", "")}
              <span className="text-muted-foreground font-normal"> / {formatCurrency(deuda.total_a_pagar)}</span>
            </p>
          </div>
          <span className="text-lg tabular-nums font-bold text-brand-1">{deuda.progreso_pct}%</span>
        </div>
        <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-brand-1 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(deuda.progreso_pct, 100)}%` }}
          />
        </div>
        <p className="xs text-muted-foreground">
          {deuda.cuotas_pagadas} de {deuda.total_cuotas} cuota{deuda.total_cuotas !== 1 ? "s" : ""} · Saldo: <span className="font-medium text-foreground">{formatCurrency(deuda.saldo_pendiente)}</span>
        </p>
      </div>

      {/* Próxima cuota */}
      {proximaCuota && deuda.estado === "activa" && (
        <div className={cn(
          "flex items-center justify-between px-3 py-2.5 rounded-xl border",
          proximaCuota.fecha_vencimiento < hoy
            ? "border-destructive/30 bg-destructive/5"
            : "border-border bg-muted/20",
        )}>
          <div>
            <p className="xs text-muted-foreground">Próxima cuota #{proximaCuota.numero_cuota}</p>
            <p className="small font-semibold">{formatCurrency(proximaCuota.cuota_total)}</p>
            <p className="xs text-muted-foreground">{formatDate(proximaCuota.fecha_vencimiento)}</p>
          </div>
          {proximaCuota.fecha_vencimiento < hoy && (
            <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
          )}
        </div>
      )}

      {deuda.estado === "pagada" && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-chart-3/10 border border-chart-3/20">
          <CheckCircle2 className="h-4 w-4 text-chart-3 shrink-0" />
          <p className="small text-chart-3 font-medium">Deuda completamente saldada</p>
        </div>
      )}

      {/* Acciones */}
      <div className="flex gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5 text-xs"
          onClick={onVerTabla}
        >
          <Eye className="h-3.5 w-3.5" />
          Ver tabla
        </Button>
        {proximaCuota && deuda.estado === "activa" && (
          <Button
            size="sm"
            className="flex-1 gap-1.5 text-xs bg-brand-1 hover:bg-brand-1/90 text-white"
            onClick={() => onPagar(proximaCuota)}
          >
            <CreditCard className="h-3.5 w-3.5" />
            Pagar cuota
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function DeudasPage() {
  const { token } = useAuth();
  const [deudas, setDeudas] = useState<Deuda[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<Deuda | null>(null);
  const [deleteItem, setDeleteItem] = useState<Deuda | null>(null);
  const [detailItem, setDetailItem] = useState<Deuda | null>(null);
  const [pagoItem, setPagoItem] = useState<{ cuota: Cuota; deudaId: number; deudaNombre: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchDeudas = useCallback(async () => {
    if (!token) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const res = await listDeudas(token);
      const data = Array.isArray(res.data) ? res.data : [];
      setDeudas(data);
      // Sync el modal de detalle si está abierto
      setDetailItem((prev) => prev ? (data.find((d) => d.id === prev.id) ?? null) : null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar deudas.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchDeudas(); }, [fetchDeudas]);

  const handleDelete = async () => {
    if (!deleteItem || !token) return;
    setIsDeleting(true);
    try {
      await deleteDeuda(token, deleteItem.id);
      toast.success("Deuda eliminada.");
      setDeleteItem(null);
      if (detailItem?.id === deleteItem.id) setDetailItem(null);
      fetchDeudas();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePagarCuota = (cuota: Cuota, deuda: Deuda) => {
    setPagoItem({ cuota, deudaId: deuda.id, deudaNombre: deuda.nombre });
  };

  if (isLoading) return <PageLoading />;
  if (error) return <PageError message={error} />;

  const activas = deudas.filter((d) => d.estado === "activa");
  const cerradas = deudas.filter((d) => d.estado !== "activa");

  return (
    <PageShell>
      <PageHeader
        title="Deudas"
        description="Seguí tus préstamos y créditos. Visualizá el plan de pagos y registrá cada cuota."
        action={
          <Button
            className="small bg-brand-1 hover:bg-brand-1/90 text-white gap-2"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="h-4 w-4" />
            Nueva deuda
          </Button>
        }
      />

      {deudas.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand-1/10 flex items-center justify-center">
            <TrendingDown className="h-7 w-7 text-brand-1" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Sin deudas registradas</p>
            <p className="small text-muted-foreground mt-1">
              Registrá un préstamo para ver su tabla de amortización y seguir cada cuota.
            </p>
          </div>
          <Button
            className="bg-brand-1 hover:bg-brand-1/90 text-white gap-2"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="h-4 w-4" />
            Registrar primera deuda
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {activas.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="small font-bold text-muted-foreground uppercase tracking-wider">
                Activas ({activas.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activas.map((d) => (
                  <DeudaCard
                    key={d.id}
                    deuda={d}
                    onEdit={() => setEditItem(d)}
                    onDelete={() => setDeleteItem(d)}
                    onVerTabla={() => setDetailItem(d)}
                    onPagar={(cuota) => handlePagarCuota(cuota, d)}
                  />
                ))}
              </div>
            </section>
          )}

          {cerradas.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="small font-bold text-muted-foreground uppercase tracking-wider">
                Pagadas / Canceladas ({cerradas.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cerradas.map((d) => (
                  <DeudaCard
                    key={d.id}
                    deuda={d}
                    onEdit={() => setEditItem(d)}
                    onDelete={() => setDeleteItem(d)}
                    onVerTabla={() => setDetailItem(d)}
                    onPagar={(cuota) => handlePagarCuota(cuota, d)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Modales */}
      <DeudaForm
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={fetchDeudas}
      />

      <DeudaForm
        open={!!editItem}
        onClose={() => setEditItem(null)}
        onSuccess={fetchDeudas}
        editItem={editItem}
      />

      {detailItem && (
        <DeudaDetailModal
          deuda={detailItem}
          onClose={() => setDetailItem(null)}
          onPagarCuota={(cuota) => handlePagarCuota(cuota, detailItem)}
        />
      )}

      <PagoCuotaModal
        open={!!pagoItem}
        onClose={() => setPagoItem(null)}
        onSuccess={() => { fetchDeudas(); setPagoItem(null); }}
        cuota={pagoItem?.cuota ?? null}
        deudaId={pagoItem?.deudaId ?? null}
        deudaNombre={pagoItem?.deudaNombre ?? null}
      />

      <ConfirmDeleteModal
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        itemName={deleteItem?.nombre}
        isLoading={isDeleting}
      />
    </PageShell>
  );
}
