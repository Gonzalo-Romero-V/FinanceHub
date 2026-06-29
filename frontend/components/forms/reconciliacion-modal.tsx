"use client";

import { useState } from "react";
import { Loader2, Scale } from "lucide-react";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useAuth } from "@/lib/auth/context";
import { createReconciliacion } from "@/lib/api/reconciliaciones";
import { formatCurrency } from "@/lib/utils/format";

interface ReconciliacionModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  cuenta: { id: number; nombre: string; saldo: number } | null;
}

export function ReconciliacionModal({
  open,
  onClose,
  onSuccess,
  cuenta,
}: ReconciliacionModalProps) {
  const { token } = useAuth();
  const [saldoReal, setSaldoReal] = useState("");
  const [nota, setNota] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saldoRealNum = parseFloat(saldoReal) || 0;
  const diferencia = cuenta ? saldoRealNum - cuenta.saldo : 0;
  const hayDiferencia = Math.abs(diferencia) > 0.001;

  const handleClose = () => {
    setSaldoReal("");
    setNota("");
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!token || !cuenta) return;
    if (!saldoReal || isNaN(saldoRealNum) || saldoRealNum < 0) {
      setError("Ingresá un saldo real válido (mayor o igual a cero).");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await createReconciliacion(token, cuenta.id, {
        saldo_real: saldoRealNum,
        crear_ajuste: true,
        nota: nota.trim() || undefined,
      });
      handleClose();
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar la reconciliación.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`Conciliar: ${cuenta?.nombre ?? ""}`}
      size="sm"
      persistent={isSaving}
    >
      <div className="flex flex-col gap-5">
        {/* Saldo actual del sistema */}
        <div className="rounded-lg bg-muted/40 px-4 py-3 space-y-1">
          <p className="xs text-muted-foreground">Saldo registrado en el sistema</p>
          <p className="font-semibold text-lg tabular-nums">
            {formatCurrency(cuenta?.saldo ?? 0)}
          </p>
        </div>

        {/* Saldo real */}
        <div className="space-y-1.5">
          <Label htmlFor="saldo-real">Saldo real actual</Label>
          <Input
            id="saldo-real"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={saldoReal}
            onChange={(e) => setSaldoReal(e.target.value)}
          />
          <p className="xs text-muted-foreground">
            Lo que realmente tenés en esta cuenta ahora.
          </p>
        </div>

        {/* Diferencia calculada */}
        {saldoReal !== "" && (
          <div
            className={`rounded-lg px-4 py-3 space-y-0.5 ${
              !hayDiferencia
                ? "bg-chart-2/10 border border-chart-2/20"
                : diferencia > 0
                ? "bg-chart-2/10 border border-chart-2/20"
                : "bg-destructive/10 border border-destructive/20"
            }`}
          >
            <p className="xs text-muted-foreground">Diferencia</p>
            <p
              className={`font-semibold tabular-nums ${
                !hayDiferencia
                  ? "text-chart-2"
                  : diferencia > 0
                  ? "text-chart-2"
                  : "text-destructive"
              }`}
            >
              {diferencia >= 0 ? "+" : ""}
              {formatCurrency(diferencia)}
            </p>
            {!hayDiferencia && (
              <p className="xs text-muted-foreground">El saldo coincide.</p>
            )}
          </div>
        )}

        {/* Info de ajuste automático */}
        {hayDiferencia && (
          <p className="xs text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">
            Se creará un movimiento de ajuste automático de{" "}
            <span className="font-semibold text-foreground tabular-nums">
              {formatCurrency(Math.abs(diferencia))}
            </span>{" "}
            para cuadrar el saldo.
          </p>
        )}

        {/* Nota */}
        <div className="space-y-1.5">
          <Label htmlFor="nota-reconciliacion">Nota (opcional)</Label>
          <Input
            id="nota-reconciliacion"
            placeholder="Ej: revisión de fin de mes"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
          />
        </div>

        {error && <p className="xs text-destructive">{error}</p>}

        <div className="flex justify-end gap-3 pt-1">
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSaving || !saldoReal}
            className="gap-2 bg-brand-1 hover:bg-brand-1/90 text-white"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Scale className="h-4 w-4" />
            )}
            Guardar conciliación
          </Button>
        </div>
      </div>
    </Modal>
  );
}
