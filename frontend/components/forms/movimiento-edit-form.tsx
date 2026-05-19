"use client";

import { useEffect, useState } from "react";
import {
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  Loader2,
  type LucideIcon,
} from "lucide-react";

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
import { listConceptos, type Concepto } from "@/lib/api/conceptos";
import { listCuentas, type Cuenta } from "@/lib/api/cuentas";
import { updateMovimiento } from "@/lib/api/movimientos";

type TipoMov = "Ingreso" | "Egreso" | "Transferencia";

interface MovimientoEditItem {
  id: number;
  concepto_id?: number;
  concepto?: string;
  cuenta_origen_id?: number;
  cuenta_destino_id?: number;
  monto: number;
  nota?: string;
  fecha: string;
  tipo_movimiento?: string;
}

interface MovimientoEditFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editItem: MovimientoEditItem | null;
}

const TIPO_META: Record<TipoMov, { icon: LucideIcon; color: string; bg: string; border: string }> = {
  Ingreso: {
    icon: ArrowDownLeft,
    color: "text-chart-2",
    bg: "bg-chart-2/10",
    border: "border-chart-2/30",
  },
  Egreso: {
    icon: ArrowUpRight,
    color: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/30",
  },
  Transferencia: {
    icon: ArrowRightLeft,
    color: "text-brand-1",
    bg: "bg-brand-1/10",
    border: "border-brand-1/30",
  },
};

export function MovimientoEditForm({
  open,
  onClose,
  onSuccess,
  editItem,
}: MovimientoEditFormProps) {
  const { token } = useAuth();

  const [conceptos, setConceptos] = useState<Concepto[]>([]);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [conceptoId, setConceptoId] = useState("");
  const [cuentaOrigenId, setCuentaOrigenId] = useState("");
  const [cuentaDestinoId, setCuentaDestinoId] = useState("");
  const [monto, setMonto] = useState("");
  const [nota, setNota] = useState("");

  useEffect(() => {
    if (!open || !token) return;
    setIsFetchingData(true);
    Promise.all([listConceptos(token), listCuentas(token)])
      .then(([cData, cuData]) => {
        setConceptos(Array.isArray(cData.data) ? cData.data : []);
        setCuentas(Array.isArray(cuData.data) ? cuData.data : []);
      })
      .catch(() => setError("Error al cargar datos."))
      .finally(() => setIsFetchingData(false));
  }, [open, token]);

  useEffect(() => {
    if (!open || !editItem) return;
    setConceptoId(editItem.concepto_id ? String(editItem.concepto_id) : "");
    setCuentaOrigenId(editItem.cuenta_origen_id ? String(editItem.cuenta_origen_id) : "");
    setCuentaDestinoId(editItem.cuenta_destino_id ? String(editItem.cuenta_destino_id) : "");
    setMonto(String(editItem.monto));
    setNota(editItem.nota || "");
    setError(null);
  }, [open, editItem]);

  const tipoActual = conceptos.find((c) => c.id === Number(conceptoId))?.tipo_movimiento
    ?.nombre as TipoMov | undefined;

  const requiereOrigen = tipoActual === "Egreso" || tipoActual === "Transferencia";
  const requiereDestino = tipoActual === "Ingreso" || tipoActual === "Transferencia";

  // Reacciona al cambio de tipo: limpia el/los campo(s) que ya no aplican.
  useEffect(() => {
    if (!tipoActual) return;
    if (!requiereOrigen && cuentaOrigenId) setCuentaOrigenId("");
    if (!requiereDestino && cuentaDestinoId) setCuentaDestinoId("");
  }, [tipoActual, requiereOrigen, requiereDestino, cuentaOrigenId, cuentaDestinoId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!conceptoId) return setError("Selecciona un concepto.");
    if (requiereOrigen && !cuentaOrigenId) return setError("Selecciona la cuenta de origen.");
    if (requiereDestino && !cuentaDestinoId) return setError("Selecciona la cuenta de destino.");
    if (
      tipoActual === "Transferencia" &&
      cuentaOrigenId &&
      cuentaDestinoId &&
      cuentaOrigenId === cuentaDestinoId
    ) {
      return setError("La cuenta de origen y la de destino deben ser diferentes.");
    }
    if (!monto || isNaN(Number(monto)) || Number(monto) <= 0)
      return setError("El monto debe ser mayor a 0.");

    setIsLoading(true);
    try {
      if (!token || !editItem) throw new Error("Usuario no autenticado.");

      await updateMovimiento(token, editItem.id, {
        concepto_id: Number(conceptoId),
        monto: Number(monto),
        nota: nota.trim() || null,
        cuenta_origen_id: requiereOrigen ? Number(cuentaOrigenId) : null,
        cuenta_destino_id: requiereDestino ? Number(cuentaDestinoId) : null,
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!editItem) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Editar movimiento"
      size="md"
      persistent={isLoading}
    >
      {isFetchingData ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-brand-1" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {tipoActual && <TipoBadge tipo={tipoActual} />}

          <div className="flex flex-col gap-1.5">
            <Label>Concepto</Label>
            <Select value={conceptoId} onValueChange={setConceptoId} disabled={isLoading}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona un concepto" />
              </SelectTrigger>
              <SelectContent>
                {conceptos.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.nombre}
                    {c.tipo_movimiento && (
                      <span className="text-muted-foreground ml-2 xs">
                        ({c.tipo_movimiento.nombre})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="xs text-muted-foreground">
              Al cambiar el concepto, el tipo de movimiento se actualiza y los campos de cuenta se ajustan.
            </p>
          </div>

          {requiereOrigen && (
            <div className="flex flex-col gap-1.5">
              <Label>
                Cuenta de origen <span className="text-destructive">*</span>
              </Label>
              <Select value={cuentaOrigenId} onValueChange={setCuentaOrigenId} disabled={isLoading}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona una cuenta" />
                </SelectTrigger>
                <SelectContent>
                  {cuentas.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {requiereDestino && (
            <div className="flex flex-col gap-1.5">
              <Label>
                Cuenta de destino <span className="text-destructive">*</span>
              </Label>
              <Select value={cuentaDestinoId} onValueChange={setCuentaDestinoId} disabled={isLoading}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona una cuenta" />
                </SelectTrigger>
                <SelectContent>
                  {cuentas
                    .filter((c) => !cuentaOrigenId || c.id !== Number(cuentaOrigenId))
                    .map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.nombre}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-monto">
              Monto <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold small">
                $
              </span>
              <Input
                id="edit-monto"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="pl-7"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-nota">Descripción (opcional)</Label>
            <Input
              id="edit-nota"
              placeholder="Detalle adicional…"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {error && (
            <p className="small text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" type="button" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-brand-1 hover:bg-brand-1/90 text-white min-w-[100px]"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar cambios"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function TipoBadge({ tipo }: { tipo: TipoMov }) {
  const meta = TIPO_META[tipo];
  const Icon = meta.icon;
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border p-3",
        meta.bg,
        meta.border,
      )}
    >
      <Icon className={cn("h-5 w-5", meta.color)} />
      <div className="leading-tight">
        <p className="xs uppercase tracking-wider text-muted-foreground font-bold">Tipo</p>
        <p className={cn("small font-bold", meta.color)}>{tipo}</p>
      </div>
    </div>
  );
}
