"use client";

import { useState, useEffect, useCallback } from "react";
import { PiggyBank, Plus, Pencil, Trash2 } from "lucide-react";
import { notifySuccess, notifyError } from "@/lib/ui/notify";
import { CoachMark } from "@/components/onboarding/coach-mark";

import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/custom/page-shell";
import { PageHeader } from "@/components/custom/page-header";
import { PageLoading, PageError } from "@/components/custom/page-state";
import { PresupuestoForm } from "@/components/forms/presupuesto-form";
import { ConfirmDeleteModal } from "@/components/forms/confirm-delete-modal";

import { useAuth } from "@/lib/auth/context";
import { useOnboarding } from "@/lib/onboarding/context";
import {
  listPresupuestos,
  deletePresupuesto,
  VENTANA_LABELS,
  type Presupuesto,
} from "@/lib/api/presupuestos";
import { conceptoColor } from "@/lib/api/conceptos";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

function barColor(pct: number): string {
  if (pct >= 100) return "bg-destructive";
  if (pct >= 90) return "bg-destructive";
  if (pct >= 75) return "bg-orange-500";
  if (pct >= 50) return "bg-amber-500";
  return "bg-chart-2";
}

function pctColor(pct: number): string {
  if (pct >= 90) return "text-destructive font-bold";
  if (pct >= 75) return "text-orange-500 font-semibold";
  if (pct >= 50) return "text-amber-500 font-semibold";
  return "text-chart-2 font-semibold";
}

function VentanaBadge({ ventana }: { ventana: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-brand-1/10 text-brand-1 xs font-semibold uppercase tracking-wide">
      {VENTANA_LABELS[ventana as keyof typeof VENTANA_LABELS] ?? ventana}
    </span>
  );
}

function PresupuestoCard({
  presupuesto,
  onEdit,
  onDelete,
}: {
  presupuesto: Presupuesto;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const pct = Math.round((presupuesto.porcentaje ?? 0) * 10) / 10;
  const consumo = presupuesto.consumo ?? 0;
  const dotColor = presupuesto.concepto ? conceptoColor(presupuesto.concepto) : "#64748b";
  const barW = Math.min(pct, 100);

  return (
    <div
      className={cn(
        "flex flex-col gap-4 p-5 rounded-2xl border bg-card transition-opacity",
        !presupuesto.activo && "opacity-50",
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: dotColor ?? "#64748b" }}
          />
          <span className="font-semibold text-foreground truncate">
            {presupuesto.concepto?.nombre ?? `Presupuesto #${presupuesto.id}`}
          </span>
          {!presupuesto.activo && (
            <span className="xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
              inactivo
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <VentanaBadge ventana={presupuesto.ventana} />
          <button
            type="button"
            onClick={onEdit}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            aria-label="Editar presupuesto"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            aria-label="Eliminar presupuesto"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Montos */}
      <div className="flex items-end justify-between">
        <div>
          <p className="xs text-muted-foreground mb-0.5">Consumido del período</p>
          <p className="font-semibold tabular-nums">
            <span className="text-muted-foreground/40 font-normal mr-1">$</span>
            {formatCurrency(consumo).replace("$", "")}
            <span className="text-muted-foreground font-normal">
              {" "}/ {formatCurrency(presupuesto.monto)}
            </span>
          </p>
        </div>
        <span className={cn("text-lg tabular-nums", pctColor(pct))}>
          {pct}%
        </span>
      </div>

      {/* Barra de progreso */}
      <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", barColor(pct))}
          style={{ width: `${barW}%` }}
        />
      </div>

      {/* Umbrales */}
      {presupuesto.umbrales?.length > 0 && (
        <p className="xs text-muted-foreground">
          Alertas en:{" "}
          {presupuesto.umbrales
            .slice()
            .sort((a, b) => a - b)
            .map((u) => `${u}%`)
            .join(" · ")}
        </p>
      )}
    </div>
  );
}

export default function PresupuestosPage() {
  const { token } = useAuth();
  const { isSeen } = useOnboarding();
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<Presupuesto | null>(null);
  const [deleteItem, setDeleteItem] = useState<Presupuesto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPresupuestos = useCallback(async () => {
    if (!token) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const res = await listPresupuestos(token);
      setPresupuestos(Array.isArray(res.data) ? res.data : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar presupuestos.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchPresupuestos(); }, [fetchPresupuestos]);

  const handleDelete = async () => {
    if (!deleteItem || !token) return;
    setIsDeleting(true);
    try {
      await deletePresupuesto(token, deleteItem.id);
      notifySuccess("Presupuesto eliminado.");
      setDeleteItem(null);
      fetchPresupuestos();
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "Error al eliminar.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) return <PageLoading />;
  if (error) return <PageError message={error} />;

  const activos = presupuestos.filter((p) => p.activo);
  const inactivos = presupuestos.filter((p) => !p.activo);

  return (
    <PageShell>
      <PageHeader
        title="Presupuestos"
        description="Definí límites o metas por categoría y recibí alertas cuando te acercás al umbral."
        action={
          <CoachMark
            id="presupuestos"
            text="Definí un límite de gasto por categoría y te avisamos si te acercás."
            guideHref="/help"
          >
            <div>
              <Button
                className="small bg-brand-1 hover:bg-brand-1/90 text-white gap-2"
                onClick={() => setShowCreate(true)}
              >
                <Plus className="h-4 w-4" />
                Nuevo presupuesto
              </Button>
            </div>
          </CoachMark>
        }
      />

      <CoachMark
        id="presupuestos_umbrales"
        text="Cada presupuesto puede tener varios umbrales (ej. 50%, 75%, 90%) — te avisamos cada vez que cruzás uno, no solo al llegar al límite total."
        guideHref="/help"
        enabled={isSeen("presupuestos")}
      >
        <p className="xs text-muted-foreground px-2 -mt-6 mb-4">
          Los porcentajes bajo cada barra son los umbrales de alerta que configuraste.
        </p>
      </CoachMark>

      {presupuestos.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand-1/10 flex items-center justify-center">
            <PiggyBank className="h-7 w-7 text-brand-1" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Sin presupuestos aún</p>
            <p className="small text-muted-foreground mt-1">
              Creá uno para controlar tus gastos por categoría.
            </p>
          </div>
          <Button
            className="bg-brand-1 hover:bg-brand-1/90 text-white gap-2"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="h-4 w-4" />
            Crear primer presupuesto
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {activos.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="small font-bold text-muted-foreground uppercase tracking-wider">
                Activos ({activos.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activos.map((p) => (
                  <PresupuestoCard
                    key={p.id}
                    presupuesto={p}
                    onEdit={() => setEditItem(p)}
                    onDelete={() => setDeleteItem(p)}
                  />
                ))}
              </div>
            </section>
          )}

          {inactivos.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="small font-bold text-muted-foreground uppercase tracking-wider">
                Inactivos ({inactivos.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inactivos.map((p) => (
                  <PresupuestoCard
                    key={p.id}
                    presupuesto={p}
                    onEdit={() => setEditItem(p)}
                    onDelete={() => setDeleteItem(p)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <PresupuestoForm
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={fetchPresupuestos}
      />

      <PresupuestoForm
        open={!!editItem}
        onClose={() => setEditItem(null)}
        onSuccess={fetchPresupuestos}
        editItem={editItem}
      />

      <ConfirmDeleteModal
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        itemName={deleteItem?.concepto?.nombre ?? `Presupuesto #${deleteItem?.id}`}
        isLoading={isDeleting}
      />
    </PageShell>
  );
}
