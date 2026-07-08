"use client";

import { useState, useEffect } from "react";
import { Loader2, CreditCard, CheckCircle2 } from "lucide-react";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/ui/form-error";
import { notifySuccess } from "@/lib/ui/notify";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useAuth } from "@/lib/auth/context";
import { pagarCuota, type Cuota } from "@/lib/api/deudas";
import { listCuentas, type Cuenta } from "@/lib/api/cuentas";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

const SIN_CUENTA = "__ninguna__";

interface PagoCuotaModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  cuota: Cuota | null;
  deudaId: number | null;
  deudaNombre: string | null;
}

export function PagoCuotaModal({
  open,
  onClose,
  onSuccess,
  cuota,
  deudaId,
  deudaNombre,
}: PagoCuotaModalProps) {
  const { token } = useAuth();
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [cuentaId, setCuentaId] = useState<string>(SIN_CUENTA);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingCuentas, setIsLoadingCuentas] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar cuentas activas al abrir
  useEffect(() => {
    if (!open || !token) return;
    setCuentaId(SIN_CUENTA);
    setError(null);
    setIsLoadingCuentas(true);
    listCuentas(token)
      .then((res) => {
        const activas = (Array.isArray(res.data) ? res.data : []).filter((c) => c.activa);
        setCuentas(activas);
      })
      .catch(() => setError("No se pudieron cargar las cuentas."))
      .finally(() => setIsLoadingCuentas(false));
  }, [open, token]);

  const handleConfirm = async () => {
    if (!token || !cuota || !deudaId) return;
    setError(null);
    setIsSaving(true);
    try {
      const cuentaSeleccionada = cuentaId !== SIN_CUENTA ? parseInt(cuentaId, 10) : null;
      await pagarCuota(token, deudaId, cuota.id, cuentaSeleccionada);
      const msg = cuentaSeleccionada
        ? "Cuota pagada y movimiento registrado."
        : "Cuota marcada como pagada.";
      notifySuccess(msg);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar el pago.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!cuota) return null;

  const hasDesglose = cuota.capital !== null && cuota.interes !== null;
  const cuentaActual = cuentas.find((c) => String(c.id) === cuentaId);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Pagar cuota #${cuota.numero_cuota}`}
      size="sm"
      persistent={isSaving}
    >
      <div className="flex flex-col gap-4">
        {/* Resumen de la cuota */}
        <div className="flex flex-col gap-2 p-4 rounded-xl bg-muted/30 border border-border">
          {deudaNombre && (
            <p className="xs text-muted-foreground">{deudaNombre}</p>
          )}
          <div className="flex items-end justify-between">
            <div>
              <p className="xs text-muted-foreground mb-0.5">Cuota #{cuota.numero_cuota}</p>
              <p className="text-2xl font-bold tabular-nums">{formatCurrency(cuota.cuota_total)}</p>
            </div>
            <p className="small text-muted-foreground">Vence: {formatDate(cuota.fecha_vencimiento)}</p>
          </div>

          {hasDesglose && (
            <div className="flex gap-4 pt-1 border-t border-border/60 mt-1">
              <div>
                <p className="xs text-muted-foreground">Capital</p>
                <p className="small font-medium tabular-nums">{formatCurrency(cuota.capital!)}</p>
              </div>
              <div>
                <p className="xs text-muted-foreground">Interés</p>
                <p className="small font-medium tabular-nums">{formatCurrency(cuota.interes!)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Selector de cuenta */}
        <div className="flex flex-col gap-1.5">
          <Label>¿Desde qué cuenta realizás el pago?</Label>
          {isLoadingCuentas ? (
            <div className="flex items-center gap-2 text-muted-foreground small py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando cuentas...
            </div>
          ) : (
            <Select value={cuentaId} onValueChange={setCuentaId} disabled={isSaving}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sin especificar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SIN_CUENTA}>
                  <span className="text-muted-foreground">Sin especificar</span>
                </SelectItem>
                {cuentas.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    <div className="flex items-center justify-between gap-4">
                      <span>{c.nombre}</span>
                      <span className="text-muted-foreground tabular-nums text-xs">
                        {formatCurrency(c.saldo)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {cuentaId !== SIN_CUENTA && cuentaActual ? (
            <div className="flex items-start gap-1.5 px-2 py-1.5 rounded-lg bg-muted/30 border border-border mt-0.5">
              <CreditCard className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <p className="xs text-muted-foreground">
                Se creará un <span className="font-medium text-foreground">movimiento Egreso</span> de{" "}
                <span className="font-medium text-foreground">{formatCurrency(cuota.cuota_total)}</span>{" "}
                desde <span className="font-medium text-foreground">{cuentaActual.nombre}</span>.
              </p>
            </div>
          ) : (
            <p className="xs text-muted-foreground px-1">
              Sin especificar: solo se marca la cuota como pagada, sin afectar ninguna cuenta.
            </p>
          )}
        </div>

        {error && <FormError message={error} />}

        <div className="flex justify-end gap-3 pt-1">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSaving || isLoadingCuentas}
            className={cn(
              "gap-2 text-white",
              cuentaId !== SIN_CUENTA
                ? "bg-brand-1 hover:bg-brand-1/90"
                : "bg-chart-3 hover:bg-chart-3/90",
            )}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {cuentaId !== SIN_CUENTA ? "Pagar y registrar movimiento" : "Marcar como pagada"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
