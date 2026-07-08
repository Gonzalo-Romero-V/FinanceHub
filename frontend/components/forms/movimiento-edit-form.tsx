"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
import { FormError } from "@/components/ui/form-error";

import { notifyError, notifyWarning, notifyInfo } from "@/lib/ui/notify";

import { useAuth } from "@/lib/auth/context";
import { listConceptos, type Concepto } from "@/lib/api/conceptos";
import { listCuentas, type Cuenta } from "@/lib/api/cuentas";
import { updateMovimiento, type AlertaPresupuesto } from "@/lib/api/movimientos";
import { VENTANA_LABELS } from "@/lib/api/presupuestos";

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

const TIPOS: TipoMov[] = ["Ingreso", "Egreso", "Transferencia"];

const TIPO_META: Record<
  TipoMov,
  { icon: LucideIcon; color: string; bg: string; border: string }
> = {
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

const NEUTRAL_META = {
  bg: "bg-muted/30",
  border: "border-border",
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

  const [tipo, setTipo] = useState<TipoMov | "">("");
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

  // Inicializa el estado al abrir un item para editar.
  useEffect(() => {
    if (!open || !editItem) return;
    setConceptoId(editItem.concepto_id ? String(editItem.concepto_id) : "");
    setCuentaOrigenId(editItem.cuenta_origen_id ? String(editItem.cuenta_origen_id) : "");
    setCuentaDestinoId(editItem.cuenta_destino_id ? String(editItem.cuenta_destino_id) : "");
    setMonto(String(editItem.monto));
    setNota(editItem.nota || "");
    setTipo((editItem.tipo_movimiento as TipoMov | undefined) ?? "");
    setError(null);
  }, [open, editItem]);

  // Fallback: si el item no trajo tipo_movimiento, lo derivamos del concepto
  // una vez que la lista de conceptos esté cargada.
  useEffect(() => {
    if (tipo || !conceptoId || conceptos.length === 0) return;
    const found = conceptos.find((c) => c.id === Number(conceptoId));
    const t = found?.tipo_movimiento?.nombre as TipoMov | undefined;
    if (t) setTipo(t);
  }, [tipo, conceptoId, conceptos]);

  const requiereOrigen = tipo === "Egreso" || tipo === "Transferencia";
  const requiereDestino = tipo === "Ingreso" || tipo === "Transferencia";

  const conceptosFiltrados = tipo
    ? conceptos.filter((c) => c.tipo_movimiento?.nombre === tipo)
    : [];

  const handleTipoChange = (newTipo: TipoMov) => {
    if (newTipo === tipo) return;
    setTipo(newTipo);
    // El concepto y cuentas pueden no aplicar al nuevo tipo: limpiamos para
    // forzar al usuario a re-elegir explícitamente.
    setConceptoId("");
    setCuentaOrigenId("");
    setCuentaDestinoId("");
    setError(null);
  };

  const mostrarAlertasPresupuesto = (alertas: AlertaPresupuesto[]) => {
    alertas.forEach((alerta) => {
      const ventana = VENTANA_LABELS[alerta.ventana] ?? alerta.ventana;
      const superado = alerta.pct_actual >= 100;
      const msg = superado
        ? `Superaste el presupuesto ${ventana} de ${alerta.concepto_nombre} (${alerta.pct_actual}%)`
        : `Alcanzaste el ${alerta.umbral}% del presupuesto ${ventana} de ${alerta.concepto_nombre}`;

      if (superado || alerta.umbral >= 90) {
        notifyError(msg);
      } else if (alerta.umbral >= 75) {
        notifyWarning(msg);
      } else {
        notifyInfo(msg);
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!tipo) return setError("Selecciona el tipo de movimiento.");
    if (!conceptoId) return setError("Selecciona un concepto.");
    if (requiereOrigen && !cuentaOrigenId) return setError("Selecciona la cuenta de origen.");
    if (requiereDestino && !cuentaDestinoId) return setError("Selecciona la cuenta de destino.");
    if (
      tipo === "Transferencia" &&
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

      const response = await updateMovimiento(token, editItem.id, {
        concepto_id: Number(conceptoId),
        monto: Number(monto),
        nota: nota.trim() || null,
        cuenta_origen_id: requiereOrigen ? Number(cuentaOrigenId) : null,
        cuenta_destino_id: requiereDestino ? Number(cuentaDestinoId) : null,
      });

      if (response.alertas_presupuesto?.length) {
        mostrarAlertasPresupuesto(response.alertas_presupuesto);
      }

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
          <TipoSelect tipo={tipo} onChange={handleTipoChange} disabled={isLoading} />

          <div className="flex flex-col gap-1.5">
            <Label>
              Concepto <span className="text-destructive">*</span>
            </Label>
            <Select
              value={conceptoId}
              onValueChange={setConceptoId}
              disabled={isLoading || !tipo}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    !tipo
                      ? "Primero selecciona un tipo de movimiento"
                      : conceptosFiltrados.length === 0
                        ? `No tienes conceptos de tipo ${tipo}`
                        : "Selecciona un concepto"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {conceptosFiltrados.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {tipo && conceptosFiltrados.length === 0 && (
              <p className="xs text-muted-foreground">
                No tienes conceptos de tipo {tipo}.{" "}
                <Link
                  href="/conceptos"
                  className="text-brand-1 font-semibold underline hover:opacity-80"
                >
                  Crea uno desde Conceptos.
                </Link>
              </p>
            )}
          </div>

          {requiereOrigen && (
            <div className="flex flex-col gap-1.5">
              <Label>
                Cuenta de origen <span className="text-destructive">*</span>
              </Label>
              <Select
                value={cuentaOrigenId}
                onValueChange={setCuentaOrigenId}
                disabled={isLoading}
              >
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
              <Select
                value={cuentaDestinoId}
                onValueChange={setCuentaDestinoId}
                disabled={isLoading}
              >
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
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar cambios"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function TipoSelect({
  tipo,
  onChange,
  disabled,
}: {
  tipo: TipoMov | "";
  onChange: (t: TipoMov) => void;
  disabled?: boolean;
}) {
  const meta = tipo ? TIPO_META[tipo] : null;
  const Icon = meta?.icon;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border p-3 transition-colors",
        meta ? meta.bg : NEUTRAL_META.bg,
        meta ? meta.border : NEUTRAL_META.border,
      )}
    >
      <div
        className={cn(
          "grid h-9 w-9 place-items-center rounded-lg",
          meta ? meta.bg : "bg-muted/50",
        )}
      >
        {Icon ? (
          <Icon className={cn("h-5 w-5", meta!.color)} />
        ) : (
          <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 leading-tight">
        <p className="xs uppercase tracking-wider text-muted-foreground font-bold mb-0.5">
          Tipo de movimiento
        </p>
        <Select
          value={tipo}
          onValueChange={(v) => onChange(v as TipoMov)}
          disabled={disabled}
        >
          <SelectTrigger
            className={cn(
              "h-8 border-0 bg-transparent px-0 small font-bold focus:ring-0 focus:ring-offset-0 shadow-none",
              meta?.color ?? "text-foreground",
            )}
          >
            <SelectValue placeholder="Selecciona el tipo" />
          </SelectTrigger>
          <SelectContent>
            {TIPOS.map((t) => {
              const m = TIPO_META[t];
              const I = m.icon;
              return (
                <SelectItem key={t} value={t}>
                  <span className="flex items-center gap-2">
                    <I className={cn("h-4 w-4", m.color)} />
                    {t}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
