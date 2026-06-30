"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, PiggyBank } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { useAuth } from "@/lib/auth/context";
import { listConceptos, conceptoColor, type Concepto } from "@/lib/api/conceptos";
import {
  createPresupuesto,
  updatePresupuesto,
  VENTANAS,
  UMBRALES_DISPONIBLES,
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

const EMPTY: Omit<PresupuestoPayload, "concepto_id"> & { concepto_id: number | null } = {
  concepto_id: null,
  monto: 0,
  ventana: "mensual",
  umbrales: [50, 75, 90],
  activo: true,
};

export function PresupuestoForm({ open, onClose, onSuccess, editItem }: PresupuestoFormProps) {
  const { token } = useAuth();
  const isEdit = !!editItem;

  const [conceptos, setConceptos] = useState<Concepto[]>([]);
  const [isLoadingConceptos, setIsLoadingConceptos] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [conceptoId, setConceptoId] = useState<number | null>(null);
  const [monto, setMonto] = useState("");
  const [ventana, setVentana] = useState<VentanaPresupuesto>("mensual");
  const [umbrales, setUmbrales] = useState<number[]>([50, 75, 90]);
  const [activo, setActivo] = useState(true);

  const reset = useCallback(() => {
    if (editItem) {
      setConceptoId(editItem.concepto_id);
      setMonto(String(editItem.monto));
      setVentana(editItem.ventana);
      setUmbrales([...(editItem.umbrales ?? [50, 75, 90])]);
      setActivo(editItem.activo);
    } else {
      setConceptoId(null);
      setMonto("");
      setVentana("mensual");
      setUmbrales([50, 75, 90]);
      setActivo(true);
    }
    setError(null);
  }, [editItem]);

  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  useEffect(() => {
    if (!open || !token) return;
    setIsLoadingConceptos(true);
    listConceptos(token)
      .then((res) => {
        // Excluir Transferencia y es_sistema; pueden ser raíz o hijo
        const aptos = (Array.isArray(res.data) ? res.data : []).filter(
          (c) => !c.es_sistema && c.tipo_movimiento?.nombre !== "Transferencia",
        );
        setConceptos(aptos);
      })
      .catch(() => setError("Error al cargar conceptos."))
      .finally(() => setIsLoadingConceptos(false));
  }, [open, token]);

  const toggleUmbral = (u: number) => {
    setUmbrales((prev) =>
      prev.includes(u) ? prev.filter((x) => x !== u) : [...prev, u].sort((a, b) => a - b),
    );
  };

  const handleSubmit = async () => {
    setError(null);

    if (!isEdit && !conceptoId) return setError("Selecciona un concepto.");
    const montoNum = parseFloat(monto);
    if (!monto || isNaN(montoNum) || montoNum <= 0) return setError("El monto debe ser mayor a 0.");
    if (umbrales.length === 0) return setError("Selecciona al menos un umbral de alerta.");

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

  const conceptoSeleccionado = conceptos.find((c) => c.id === conceptoId);
  const dotColor = conceptoSeleccionado ? conceptoColor(conceptoSeleccionado) : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Editar presupuesto" : "Nuevo presupuesto"}
      size="sm"
      persistent={isSaving}
    >
      <div className="flex flex-col gap-5">

        {/* Concepto (solo lectura en edición) */}
        <div className="flex flex-col gap-1.5">
          <Label>Concepto {!isEdit && <span className="text-destructive">*</span>}</Label>
          {isEdit ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-muted/30">
              {dotColor && (
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
              )}
              <span className="small font-medium">{editItem?.concepto?.nombre ?? "—"}</span>
            </div>
          ) : isLoadingConceptos ? (
            <div className="flex justify-center py-3">
              <Loader2 className="h-5 w-5 animate-spin text-brand-1" />
            </div>
          ) : (
            <Select
              value={conceptoId ? String(conceptoId) : ""}
              onValueChange={(v) => setConceptoId(Number(v))}
              disabled={isSaving}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent>
                {conceptos.map((c) => {
                  const color = conceptoColor(c);
                  const isChild = !!c.parent_id;
                  return (
                    <SelectItem key={c.id} value={String(c.id)}>
                      <span className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: color ?? "#64748b" }}
                        />
                        <span className={cn(isChild && "pl-2 text-muted-foreground")}>{c.nombre}</span>
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Monto */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pres-monto">
            Límite / Meta <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold small">$</span>
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

        {/* Ventana de tiempo */}
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

        {/* Umbrales de alerta */}
        <div className="flex flex-col gap-2">
          <Label>Alertas en</Label>
          <div className="flex gap-2">
            {UMBRALES_DISPONIBLES.map((u) => {
              const active = umbrales.includes(u);
              return (
                <button
                  key={u}
                  type="button"
                  onClick={() => toggleUmbral(u)}
                  disabled={isSaving}
                  className={cn(
                    "flex-1 py-2 rounded-xl border text-sm font-semibold transition-all duration-150",
                    active
                      ? u >= 90
                        ? "border-destructive bg-destructive/10 text-destructive"
                        : u >= 75
                        ? "border-orange-500 bg-orange-500/10 text-orange-500"
                        : "border-amber-500 bg-amber-500/10 text-amber-500"
                      : "border-border text-muted-foreground hover:border-muted-foreground/40",
                  )}
                >
                  {u}%
                </button>
              );
            })}
          </div>
          <p className="xs text-muted-foreground">
            Recibirás una alerta cuando alcances cada porcentaje seleccionado.
          </p>
        </div>

        {/* Activo (solo en edición) */}
        {isEdit && (
          <div className="flex items-center justify-between py-2 px-3 rounded-xl border border-border bg-muted/20">
            <div>
              <p className="small font-medium">Estado</p>
              <p className="xs text-muted-foreground">Los presupuestos inactivos no generan alertas.</p>
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
          <p className="small text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
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
