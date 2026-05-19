"use client";

import {
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react";

import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import type { MovimientoRaw } from "@/lib/api/movimientos";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";

interface MovimientoDetailModalProps {
  open: boolean;
  onClose: () => void;
  item: MovimientoRaw | null;
}

const TIPO_META: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  Ingreso: { icon: ArrowDownLeft, color: "text-chart-2", bg: "bg-chart-2/10" },
  Egreso: { icon: ArrowUpRight, color: "text-destructive", bg: "bg-destructive/10" },
  Transferencia: { icon: ArrowRightLeft, color: "text-brand-1", bg: "bg-brand-1/10" },
};

export function MovimientoDetailModal({ open, onClose, item }: MovimientoDetailModalProps) {
  if (!item) return null;

  const tipo = item.concepto?.tipo_movimiento?.nombre ?? "Egreso";
  const meta = TIPO_META[tipo] ?? TIPO_META.Egreso;
  const Icon = meta.icon;

  return (
    <Modal open={open} onClose={onClose} title="Detalle del movimiento" size="md">
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <div className={cn("p-3 rounded-xl", meta.bg)}>
            <Icon className={cn("h-6 w-6", meta.color)} />
          </div>
          <div className="flex-1">
            <p className="xs uppercase tracking-wider text-muted-foreground font-bold">{tipo}</p>
            <p className="h2 text-foreground tabular-nums">{formatCurrency(Number(item.monto))}</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-muted/20 divide-y divide-border/50">
          <DetailRow label="Concepto" value={item.concepto?.nombre ?? "—"} />
          {item.cuenta_origen?.nombre && (
            <DetailRow label="Cuenta origen" value={item.cuenta_origen.nombre} />
          )}
          {item.cuenta_destino?.nombre && (
            <DetailRow label="Cuenta destino" value={item.cuenta_destino.nombre} />
          )}
          <DetailRow label="Fecha y hora" value={formatDateTime(item.fecha)} />
          <DetailRow
            label="Descripción"
            value={item.nota?.trim() ? item.nota : <span className="text-muted-foreground italic">Sin descripción</span>}
          />
          <DetailRow
            label="ID"
            value={<span className="font-mono xs text-muted-foreground">#{item.id}</span>}
          />
        </div>
      </div>
    </Modal>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <span className="xs uppercase tracking-wider text-muted-foreground font-bold min-w-28">
        {label}
      </span>
      <span className="small font-semibold text-right text-foreground break-words">
        {value}
      </span>
    </div>
  );
}
