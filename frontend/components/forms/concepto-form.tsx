"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/ui/form-error";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useAuth } from "@/lib/auth/context";
import {
  createConcepto,
  listConceptos,
  listTiposMovimiento,
  updateConcepto,
  CONCEPTO_PALETTE,
  type Concepto,
  type TipoMovimiento,
} from "@/lib/api/conceptos";

interface ConceptoFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** Cuando se edita un concepto existente */
  editItem?: {
    id: number;
    nombre: string;
    tipo_movimiento: string;
    parent_id?: number | null;
    color?: string | null;
    es_sistema?: boolean;
    hasChildren?: boolean;
  } | null;
  /** Pre-seleccionar un padre al crear desde el árbol */
  defaultParentId?: number | null;
}

export function ConceptoForm({
  open,
  onClose,
  onSuccess,
  editItem,
  defaultParentId,
}: ConceptoFormProps) {
  const { token } = useAuth();
  const isEdit = !!editItem;

  const [tipos, setTipos] = useState<TipoMovimiento[]>([]);
  const [raices, setRaices] = useState<Concepto[]>([]);     // conceptos raíz para elegir padre
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nombre, setNombre] = useState("");
  const [tipoId, setTipoId] = useState("");
  const [parentId, setParentId] = useState<string>("");    // "" = sin padre
  const [color, setColor] = useState<string>("");           // "" = sin color

  // ─── Carga de datos ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!open || !token) return;
    setIsFetchingData(true);
    Promise.all([listTiposMovimiento(token), listConceptos(token)])
      .then(([tiposRes, concRes]) => {
        setTipos(Array.isArray(tiposRes.data) ? tiposRes.data : []);
        // Solo conceptos raíz, no de sistema, como posibles padres
        setRaices((concRes.data ?? []).filter((c) => !c.parent_id && !c.es_sistema));
      })
      .catch(() => setError("No se pudieron cargar los datos."))
      .finally(() => setIsFetchingData(false));
  }, [open, token]);

  // ─── Pre-llenar campos ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return;
    setError(null);

    if (editItem) {
      setNombre(editItem.nombre);
      setColor(editItem.color ?? "");
      setParentId(editItem.parent_id ? String(editItem.parent_id) : "");
      const t = tipos.find((x) => x.nombre === editItem.tipo_movimiento);
      setTipoId(t ? String(t.id) : "");
    } else {
      setNombre("");
      setColor("");
      setParentId(defaultParentId ? String(defaultParentId) : "");
      setTipoId("");
    }
  }, [open, editItem, tipos, defaultParentId]);

  // ─── Derivados ─────────────────────────────────────────────────────────────

  const esSubconcepto = !!parentId;
  const parentSeleccionado = raices.find((r) => String(r.id) === parentId);

  // Cuando cambia el tipo, resetear padre si no coincide
  const raicesFiltradas = tipoId
    ? raices.filter((r) => String(r.tipo_movimiento_id ?? r.tipo_movimiento?.id) === tipoId)
    : raices;

  // ─── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!nombre.trim()) return setError("El nombre es obligatorio.");

    if (!isEdit && !esSubconcepto && !tipoId) {
      return setError("Selecciona un tipo de movimiento.");
    }

    setIsLoading(true);
    try {
      if (!token) throw new Error("Usuario no autenticado.");

      if (isEdit && editItem) {
        const payload: Parameters<typeof updateConcepto>[2] = {};

        if (!editItem.es_sistema) {
          payload.nombre = nombre.trim();
          if (!editItem.hasChildren) {
            payload.parent_id = esSubconcepto ? Number(parentId) : null;
          }
        }

        // El color es editable siempre (incluso en conceptos de sistema),
        // pero solo tiene sentido si el resultado de este submit es raíz.
        if (!esSubconcepto) {
          payload.color = color || null;
        }

        await updateConcepto(token, editItem.id, payload);
      } else {
        await createConcepto(token, {
          nombre: nombre.trim(),
          ...(esSubconcepto
            ? { parent_id: Number(parentId) }
            : {
                tipo_movimiento_id: Number(tipoId),
                color: color || null,
              }),
        });
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Editar concepto" : esSubconcepto ? "Nueva subcategoría" : "Nuevo concepto"}
      size="sm"
      persistent={isLoading}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Nombre */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="concepto-nombre">Nombre</Label>
          <Input
            id="concepto-nombre"
            placeholder={esSubconcepto ? "Ej: Restaurante, Víveres…" : "Ej: Alimentación, Salario…"}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            disabled={isLoading || editItem?.es_sistema}
          />
          {editItem?.es_sistema && (
            <p className="xs text-muted-foreground">
              Este concepto es del sistema — solo puedes cambiar el color.
            </p>
          )}
        </div>

        {/* Tipo de movimiento (solo si es raíz y no edición) */}
        {!esSubconcepto && !isEdit && (
          <div className="flex flex-col gap-1.5">
            <Label>Tipo de movimiento</Label>
            {isFetchingData ? (
              <div className="flex items-center gap-2 text-muted-foreground small">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
              </div>
            ) : (
              <Select value={tipoId} onValueChange={(v) => { setTipoId(v); setParentId(""); }} disabled={isLoading}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  {tipos.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {/* Padre — siempre al crear; al editar solo si no es de sistema y no tiene subcategorías propias */}
        {(!isEdit || (!editItem?.es_sistema && !editItem?.hasChildren)) && (
          <div className="flex flex-col gap-1.5">
            <Label>Categoría padre (opcional)</Label>
            {isFetchingData ? (
              <div className="flex items-center gap-2 text-muted-foreground small">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
              </div>
            ) : (
              <Select
                value={parentId}
                onValueChange={(v) => {
                  setParentId(v === "__none__" ? "" : v);
                  if (v && v !== "__none__") {
                    const padre = raices.find((r) => String(r.id) === v);
                    if (padre) setTipoId(String(padre.tipo_movimiento_id ?? padre.tipo_movimiento?.id ?? ""));
                  }
                }}
                disabled={isLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sin categoría padre (es raíz)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin categoría padre</SelectItem>
                  {(tipoId ? raicesFiltradas : raices)
                    .filter((r) => r.id !== editItem?.id)
                    .map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        <div className="flex items-center gap-2">
                          {r.color && (
                            <span
                              className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: r.color }}
                            />
                          )}
                          {r.nombre}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
            {esSubconcepto && parentSeleccionado && (
              <p className="xs text-muted-foreground">
                Hereda tipo:{" "}
                <span className="font-medium text-foreground">
                  {parentSeleccionado.tipo_movimiento?.nombre}
                </span>
              </p>
            )}
          </div>
        )}
        {isEdit && editItem?.hasChildren && !editItem?.es_sistema && (
          <p className="xs text-muted-foreground">
            Esta categoría tiene subcategorías propias, por eso no se puede convertir en subcategoría de otra.
          </p>
        )}

        {/* Color picker — solo para raíces */}
        {!esSubconcepto && (
          <div className="flex flex-col gap-2">
            <Label>Color de identificación</Label>
            <div className="flex flex-wrap gap-2">
              {CONCEPTO_PALETTE.map((p) => (
                <button
                  key={p.hex}
                  type="button"
                  title={p.name}
                  onClick={() => setColor(color === p.hex ? "" : p.hex)}
                  className="relative w-7 h-7 rounded-full transition-transform hover:scale-110 focus:outline-none"
                  style={{ backgroundColor: p.hex }}
                  disabled={isLoading}
                >
                  {color === p.hex && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="w-2 h-2 rounded-full bg-white shadow" />
                    </span>
                  )}
                </button>
              ))}
              {color && (
                <button
                  type="button"
                  onClick={() => setColor("")}
                  className="px-2 h-7 rounded-full text-xs text-muted-foreground border border-border hover:bg-muted/50"
                  disabled={isLoading}
                >
                  Quitar
                </button>
              )}
            </div>
            {!color && (
              <p className="xs text-muted-foreground">Sin color (se mostrará en gris).</p>
            )}
          </div>
        )}

        {error && <FormError message={error} />}

        <div className="flex justify-end gap-3 pt-1">
          <Button variant="outline" type="button" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-brand-1 hover:bg-brand-1/90 text-white min-w-[110px]"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isEdit ? (
              "Guardar"
            ) : esSubconcepto ? (
              "Crear subcategoría"
            ) : (
              "Crear concepto"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
