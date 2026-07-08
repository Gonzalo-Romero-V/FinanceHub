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
  createCuenta,
  listTiposCuenta,
  updateCuenta,
  type TipoCuenta,
} from "@/lib/api/cuentas";
import { COLOR_PALETTE } from "@/lib/ui/color-palette";

interface CuentaFormData {
  nombre: string;
  tipo_cuenta_id: string;
  saldo: string;
  activa: boolean;
}

interface CuentaFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editItem?: {
    id: number;
    nombre: string;
    tipo_cuenta: string;
    saldo: number;
    activa: string;
    color?: string | null;
  } | null;
}

export function CuentaForm({ open, onClose, onSuccess, editItem }: CuentaFormProps) {
  const { token } = useAuth();
  const isEdit = !!editItem;

  const [tiposCuenta, setTiposCuenta] = useState<TipoCuenta[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingTypes, setIsFetchingTypes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [color, setColor] = useState("");

  const [form, setForm] = useState<CuentaFormData>({
    nombre: "",
    tipo_cuenta_id: "",
    saldo: "0",
    activa: true,
  });

  useEffect(() => {
    if (!open || !token) return;
    setIsFetchingTypes(true);
    listTiposCuenta(token)
      .then((d) => setTiposCuenta(Array.isArray(d.data) ? d.data : []))
      .catch(() => setError("No se pudieron cargar los tipos de cuenta."))
      .finally(() => setIsFetchingTypes(false));
  }, [open, token]);

  useEffect(() => {
    // Espera a que el fetch de tipos termine (con o sin datos) antes de
    // poblar el form — si no, en la primera apertura este efecto corre en
    // el mismo pase que dispara el fetch, con tiposCuenta todavía vacío, y
    // el tipo de cuenta ya asignado no encuentra match (queda en blanco
    // hasta que se reabre el modal una segunda vez).
    if (!open || isFetchingTypes) return;
    if (editItem) {
      const tipoId = tiposCuenta.find((t) => t.nombre === editItem.tipo_cuenta)?.id;
      setForm({
        nombre: editItem.nombre,
        tipo_cuenta_id: tipoId ? String(tipoId) : "",
        saldo: String(editItem.saldo),
        activa: editItem.activa === "Activa",
      });
      setColor(editItem.color ?? "");
    } else {
      setForm({ nombre: "", tipo_cuenta_id: "", saldo: "0", activa: true });
      setColor("");
    }
    setError(null);
  }, [open, editItem, tiposCuenta, isFetchingTypes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.nombre.trim()) return setError("El nombre es obligatorio.");
    if (!form.tipo_cuenta_id) return setError("Selecciona un tipo de cuenta.");
    if (!isEdit && (isNaN(Number(form.saldo)) || Number(form.saldo) < 0))
      return setError("El saldo inicial debe ser un número mayor o igual a 0.");

    setIsLoading(true);
    try {
      if (!token) throw new Error("Usuario no autenticado.");

      if (isEdit && editItem) {
        await updateCuenta(token, editItem.id, {
          nombre: form.nombre.trim(),
          tipo_cuenta_id: Number(form.tipo_cuenta_id),
          activa: form.activa,
          color: color || null,
        });
      } else {
        await createCuenta(token, {
          nombre: form.nombre.trim(),
          tipo_cuenta_id: Number(form.tipo_cuenta_id),
          activa: form.activa,
          saldo: Number(form.saldo),
          color: color || null,
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
      title={isEdit ? "Editar cuenta" : "Nueva cuenta"}
      size="sm"
      persistent={isLoading}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cuenta-nombre">Nombre</Label>
          <Input
            id="cuenta-nombre"
            placeholder="Ej: Cuenta de ahorros"
            value={form.nombre}
            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
            disabled={isLoading}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Tipo de cuenta</Label>
          {isFetchingTypes ? (
            <div className="flex items-center gap-2 text-muted-foreground small">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando tipos...
            </div>
          ) : (
            <Select
              value={form.tipo_cuenta_id}
              onValueChange={(v) => setForm((f) => ({ ...f, tipo_cuenta_id: v }))}
              disabled={isLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona un tipo" />
              </SelectTrigger>
              <SelectContent>
                {tiposCuenta.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {!isEdit && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cuenta-saldo">Saldo inicial</Label>
            <Input
              id="cuenta-saldo"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.saldo}
              onChange={(e) => setForm((f) => ({ ...f, saldo: e.target.value }))}
              disabled={isLoading}
            />
            <p className="xs text-muted-foreground">
              El saldo no podrá modificarse manualmente después; solo cambiará mediante movimientos.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label>Color de identificación</Label>
          <div className="flex flex-wrap gap-2">
            {COLOR_PALETTE.map((p) => (
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

        <div className="flex items-center gap-3">
          <input
            id="cuenta-activa"
            type="checkbox"
            checked={form.activa}
            onChange={(e) => setForm((f) => ({ ...f, activa: e.target.checked }))}
            disabled={isLoading}
            className="h-4 w-4 accent-brand-1 cursor-pointer"
          />
          <Label htmlFor="cuenta-activa" className="cursor-pointer font-normal">
            Cuenta activa
          </Label>
        </div>

        {error && <FormError message={error} />}

        <div className="flex justify-end gap-3 pt-1">
          <Button variant="outline" type="button" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-brand-1 hover:bg-brand-1/90 text-white min-w-[100px]"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? "Guardar" : "Crear cuenta"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
