"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronRight, ChevronLeft, Loader2, PiggyBank, X } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { useAuth } from "@/lib/auth/context";
import { listConceptos, conceptoColor, childConceptoColor, type Concepto } from "@/lib/api/conceptos";
import {
  createPresupuesto,
  updatePresupuesto,
  VENTANAS,
  type Presupuesto,
  type PresupuestoPayload,
  type VentanaPresupuesto,
} from "@/lib/api/presupuestos";

interface PresupuestoFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editItem?: Presupuesto | null;
}

// Colores de chips de umbral según severidad
function umbralChipClass(u: number): string {
  if (u >= 90) return "bg-destructive/10 text-destructive border-destructive/40";
  if (u >= 75) return "bg-orange-500/10 text-orange-500 border-orange-500/40";
  return "bg-amber-500/10 text-amber-500 border-amber-500/40";
}

const QUICK_THRESHOLDS = [50, 75, 90];

export function PresupuestoForm({ open, onClose, onSuccess, editItem }: PresupuestoFormProps) {
  const { token } = useAuth();
  const isEdit = !!editItem;

  const [conceptos, setConceptos]               = useState<Concepto[]>([]);
  const [isLoadingConceptos, setIsLoadingConceptos] = useState(false);
  const [isSaving, setIsSaving]                 = useState(false);
  const [error, setError]                       = useState<string | null>(null);

  // Concepto
  const [conceptoId, setConceptoId]             = useState<number | null>(null);
  const [expandedParentId, setExpandedParentId] = useState<number | null>(null);

  // Resto del form
  const [monto, setMonto]     = useState("");
  const [ventana, setVentana] = useState<VentanaPresupuesto>("mensual");
  const [umbrales, setUmbrales] = useState<number[]>([50, 75, 90]);
  const [activo, setActivo]   = useState(true);

  // Input para agregar umbral libre
  const [umbralInput, setUmbralInput] = useState("");
  const umbralInputRef = useRef<HTMLInputElement>(null);

  // ── Helpers concepto ────────────────────────────────────────────────────────
  const elegibles = conceptos.filter(
    (c) => !c.es_sistema && c.tipo_movimiento?.nombre !== "Transferencia",
  );
  const raices  = elegibles.filter((c) => !c.parent_id);
  const getHijos = (pid: number) => elegibles.filter((c) => c.parent_id === pid);

  const conceptoSeleccionado = elegibles.find((c) => c.id === conceptoId) ?? null;
  const padreSeleccionado    = conceptoSeleccionado?.parent_id
    ? raices.find((r) => r.id === conceptoSeleccionado.parent_id) ?? null
    : null;

  // ── Reset ───────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    if (editItem) {
      setConceptoId(editItem.concepto_id);
      setMonto(String(editItem.monto));
      setVentana(editItem.ventana);
      setUmbrales([...(editItem.umbrales?.length ? editItem.umbrales : [50, 75, 90])].sort((a, b) => a - b));
      setActivo(editItem.activo);
    } else {
      setConceptoId(null);
      setMonto("");
      setVentana("mensual");
      setUmbrales([50, 75, 90]);
      setActivo(true);
    }
    setExpandedParentId(null);
    setUmbralInput("");
    setError(null);
  }, [editItem]);

  useEffect(() => { if (open) reset(); }, [open, reset]);

  // ── Cargar conceptos ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open || !token) return;
    setIsLoadingConceptos(true);
    listConceptos(token)
      .then((res) => setConceptos(Array.isArray(res.data) ? res.data : []))
      .catch(() => setError("Error al cargar conceptos."))
      .finally(() => setIsLoadingConceptos(false));
  }, [open, token]);

  // ── Umbrales ────────────────────────────────────────────────────────────────
  const addUmbral = () => {
    const val = parseInt(umbralInput, 10);
    if (isNaN(val) || val < 1 || val > 100) return;
    if (umbrales.includes(val)) { setUmbralInput(""); return; }
    if (umbrales.length >= 6) return;
    setUmbrales((prev) => [...prev, val].sort((a, b) => a - b));
    setUmbralInput("");
    umbralInputRef.current?.focus();
  };

  const removeUmbral = (u: number) =>
    setUmbrales((prev) => prev.filter((x) => x !== u));

  const quickAdd = (u: number) => {
    if (!umbrales.includes(u) && umbrales.length < 6)
      setUmbrales((prev) => [...prev, u].sort((a, b) => a - b));
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setError(null);
    if (!isEdit && !conceptoId) return setError("Selecciona un concepto.");
    const montoNum = parseFloat(monto);
    if (!monto || isNaN(montoNum) || montoNum <= 0)
      return setError("El monto debe ser mayor a 0.");
    if (umbrales.length === 0)
      return setError("Agrega al menos un umbral de alerta.");

    setIsSaving(true);
    try {
      if (!token) throw new Error("Usuario no autenticado.");
      if (isEdit) {
        await updatePresupuesto(token, editItem!.id, { monto: montoNum, ventana, umbrales, activo });
        toast.success("Presupuesto actualizado.");
      } else {
        await createPresupuesto(token, {
          concepto_id: conceptoId!,
          monto: montoNum,
          ventana,
          umbrales,
          activo,
        });
        toast.success("Presupuesto creado.");
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Render selector concepto ─────────────────────────────────────────────────
  const renderConceptoSelector = () => {
    if (isEdit) {
      const dotColor = conceptoSeleccionado ? conceptoColor(conceptoSeleccionado) : null;
      return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-muted/30">
          {dotColor && (
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
          )}
          <span className="text-sm font-medium">{editItem?.concepto?.nombre ?? "—"}</span>
        </div>
      );
    }

    if (isLoadingConceptos) {
      return (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-brand-1" />
        </div>
      );
    }

    // ── Vista: subcategorías de un padre expandido ───────────────────────────
    if (expandedParentId !== null) {
      const padre = raices.find((r) => r.id === expandedParentId);
      if (!padre) { setExpandedParentId(null); return null; }
      const hijos   = getHijos(expandedParentId);
      const dotColor = padre.color ?? "#64748b";

      return (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setExpandedParentId(null)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Todas las categorías
          </button>

          <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1">
            {/* Opción: usar el padre directamente */}
            <button
              type="button"
              onClick={() => { setConceptoId(padre.id); setExpandedParentId(null); }}
              className="w-full text-left px-3 py-2.5 rounded-xl border border-dashed border-border hover:border-muted-foreground/50 hover:bg-muted/30 transition-all text-sm flex items-center gap-2.5 text-muted-foreground"
            >
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
              Usar «{padre.nombre}» directamente
            </button>

            {hijos.map((hijo) => (
              <button
                key={hijo.id}
                type="button"
                onClick={() => { setConceptoId(hijo.id); setExpandedParentId(null); }}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-xl border transition-all text-sm font-medium flex items-center gap-2.5",
                  conceptoId === hijo.id
                    ? "border-brand-1 bg-brand-1/10 text-brand-1"
                    : "border-border hover:border-muted-foreground/50 hover:bg-muted/30",
                )}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: childConceptoColor(dotColor) }}
                />
                {hijo.nombre}
              </button>
            ))}
          </div>
        </div>
      );
    }

    // ── Vista: categorías raíz ───────────────────────────────────────────────
    return (
      <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1">
        {raices.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No hay categorías disponibles.</p>
        ) : (
          raices.map((raiz) => {
            const hijos    = getHijos(raiz.id);
            const dotColor = raiz.color ?? "#64748b";
            const selected = conceptoId === raiz.id ||
              (conceptoSeleccionado?.parent_id === raiz.id);

            return (
              <button
                key={raiz.id}
                type="button"
                onClick={() =>
                  hijos.length > 0
                    ? setExpandedParentId(raiz.id)
                    : setConceptoId(raiz.id)
                }
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-xl border transition-all text-sm font-medium flex items-center gap-2.5",
                  selected
                    ? "border-brand-1 bg-brand-1/10 text-brand-1"
                    : "border-border hover:border-muted-foreground/50 hover:bg-muted/30",
                )}
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                <span className="flex-1">{raiz.nombre}</span>
                {hijos.length > 0 && (
                  <span className="flex items-center gap-0.5 text-xs text-muted-foreground font-normal">
                    {hijos.length} sub
                    <ChevronRight className="h-3 w-3" />
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    );
  };

  // ── Etiqueta de concepto seleccionado (feedback visual) ──────────────────────
  const renderConceptoBadge = () => {
    if (isEdit || !conceptoId) return null;
    const dotColor = conceptoSeleccionado ? conceptoColor(conceptoSeleccionado) : "#64748b";
    const nombre   = conceptoSeleccionado
      ? padreSeleccionado
        ? `${padreSeleccionado.nombre} › ${conceptoSeleccionado.nombre}`
        : conceptoSeleccionado.nombre
      : "—";

    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/40 border border-border w-fit">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
        <span className="text-xs font-medium text-foreground">{nombre}</span>
        <button
          type="button"
          onClick={() => { setConceptoId(null); setExpandedParentId(null); }}
          className="ml-0.5 text-muted-foreground hover:text-foreground"
          title="Cambiar"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  };

  // ────────────────────────────────────────────────────────────────────────────

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Editar presupuesto" : "Nuevo presupuesto"}
      size="sm"
      persistent={isSaving}
    >
      <div className="flex flex-col gap-5">

        {/* ── Concepto ────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label>
              Concepto {!isEdit && <span className="text-destructive">*</span>}
            </Label>
            {renderConceptoBadge()}
          </div>
          {/* Ocultar selector si ya hay uno seleccionado (modo crear) */}
          {(!conceptoId || isEdit) && renderConceptoSelector()}
        </div>

        {/* ── Monto ───────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pres-monto">
            Límite / Meta <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">$</span>
            <Input
              id="pres-monto"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="pl-7"
              disabled={isSaving}
            />
          </div>
        </div>

        {/* ── Ventana de tiempo ───────────────────────────────────────────── */}
        <div className="flex flex-col gap-1.5">
          <Label>Ventana de tiempo</Label>
          <div className="grid grid-cols-4 gap-2">
            {VENTANAS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setVentana(value)}
                disabled={isSaving}
                className={cn(
                  "py-2 rounded-xl border text-sm font-medium transition-all duration-150",
                  ventana === value
                    ? "border-brand-1 bg-brand-1/10 text-brand-1"
                    : "border-border hover:border-muted-foreground/40 text-muted-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Umbrales de alerta ──────────────────────────────────────────── */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Label>Umbrales de alerta</Label>
            {/* Accesos rápidos a los valores comunes */}
            <div className="flex gap-1">
              {QUICK_THRESHOLDS.filter((q) => !umbrales.includes(q)).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => quickAdd(q)}
                  disabled={isSaving || umbrales.length >= 6}
                  className="text-xs px-2 py-0.5 rounded-full border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-brand-1 hover:text-brand-1 transition-colors disabled:opacity-40"
                  title={`Agregar ${q}%`}
                >
                  +{q}%
                </button>
              ))}
            </div>
          </div>

          {/* Chips de umbrales activos */}
          <div
            className={cn(
              "flex flex-wrap gap-1.5 min-h-[38px] px-2.5 py-2 rounded-xl border transition-colors",
              umbrales.length === 0 ? "border-dashed border-muted-foreground/30" : "border-border bg-muted/10",
            )}
          >
            {umbrales.length === 0 ? (
              <span className="text-xs text-muted-foreground self-center">
                Sin umbrales — agrega al menos uno
              </span>
            ) : (
              umbrales.map((u) => (
                <span
                  key={u}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border",
                    umbralChipClass(u),
                  )}
                >
                  {u}%
                  <button
                    type="button"
                    onClick={() => removeUmbral(u)}
                    disabled={isSaving}
                    className="hover:opacity-60 transition-opacity ml-0.5"
                    aria-label={`Quitar ${u}%`}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))
            )}
          </div>

          {/* Fila para agregar umbral libre */}
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Input
                ref={umbralInputRef}
                type="number"
                min="1"
                max="100"
                step="1"
                placeholder="Ej: 80"
                value={umbralInput}
                onChange={(e) => setUmbralInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addUmbral()}
                className="pr-7"
                disabled={isSaving || umbrales.length >= 6}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                %
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addUmbral}
              disabled={isSaving || umbrales.length >= 6 || !umbralInput}
            >
              Agregar
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Recibirás una alerta cuando el consumo alcance cada porcentaje. Máx. 6 umbrales.
          </p>
        </div>

        {/* ── Activo (solo edición) ────────────────────────────────────────── */}
        {isEdit && (
          <div className="flex items-center justify-between py-2 px-3 rounded-xl border border-border bg-muted/20">
            <div>
              <p className="text-sm font-medium">Estado</p>
              <p className="text-xs text-muted-foreground">Los presupuestos inactivos no generan alertas.</p>
            </div>
            <button
              type="button"
              onClick={() => setActivo((v) => !v)}
              disabled={isSaving}
              className={cn(
                "relative w-11 h-6 rounded-full transition-colors duration-200",
                activo ? "bg-brand-1" : "bg-muted",
              )}
            >
              <span
                className={cn(
                  "absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200",
                  activo && "translate-x-5",
                )}
              />
            </button>
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSaving}
            className="gap-2 bg-brand-1 hover:bg-brand-1/90 text-white"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PiggyBank className="h-4 w-4" />
            )}
            {isEdit ? "Guardar cambios" : "Crear presupuesto"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
