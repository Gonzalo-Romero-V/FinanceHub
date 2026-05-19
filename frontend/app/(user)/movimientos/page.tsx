"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowUpRight, ArrowDownLeft, ArrowRightLeft, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/custom/data-table";
import { PageShell } from "@/components/custom/page-shell";
import { PageHeader } from "@/components/custom/page-header";
import { PageLoading, PageError } from "@/components/custom/page-state";
import { MovimientoForm } from "@/components/forms/movimiento-form";
import { MovimientoEditForm } from "@/components/forms/movimiento-edit-form";
import { MovimientoDetailModal } from "@/components/forms/movimiento-detail-modal";
import { ConfirmDeleteModal } from "@/components/forms/confirm-delete-modal";

import { useAuth } from "@/lib/auth/context";
import {
  listMovimientos,
  deleteMovimiento,
  type MovimientoRaw,
} from "@/lib/api/movimientos";
import { formatNumber, isSameLocalDay } from "@/lib/utils/format";

type TipoMov = "Ingreso" | "Egreso" | "Transferencia";

interface MovimientoRow {
  id: number;
  fecha: string;
  nota: string;
  concepto: string;
  monto: number;
  cuenta: string;
  tipo_movimiento: TipoMov;
}

function toRow(item: MovimientoRaw): MovimientoRow {
  const tipo = (item.concepto?.tipo_movimiento?.nombre as TipoMov) ?? "Egreso";
  const cuentaOrigen = item.cuenta_origen?.nombre ?? "N/A";
  const cuentaDestino = item.cuenta_destino?.nombre ?? "N/A";

  let cuenta: string;
  if (tipo === "Ingreso") cuenta = cuentaDestino;
  else if (tipo === "Transferencia") cuenta = `${cuentaOrigen} / ${cuentaDestino}`;
  else cuenta = cuentaOrigen;

  return {
    id: item.id,
    fecha: item.fecha,
    nota: item.nota?.trim() ?? "",
    concepto: item.concepto?.nombre ?? "N/A",
    monto: Number(item.monto) || 0,
    cuenta,
    tipo_movimiento: tipo,
  };
}

export default function MovimientosPage() {
  const { token } = useAuth();
  const [movimientos, setMovimientos] = useState<MovimientoRow[]>([]);
  const [rawMovimientos, setRawMovimientos] = useState<MovimientoRaw[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [viewItem, setViewItem] = useState<MovimientoRaw | null>(null);
  const [editItem, setEditItem] = useState<MovimientoRaw | null>(null);
  const [deleteItem, setDeleteItem] = useState<MovimientoRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchMovimientos = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const response = await listMovimientos(token);
      const arrayData = Array.isArray(response.data) ? response.data : [];
      setRawMovimientos(arrayData);
      setMovimientos(arrayData.map(toRow));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchMovimientos();
  }, [fetchMovimientos]);

  const handleDelete = async () => {
    if (!deleteItem || !token) return;
    setIsDeleting(true);
    try {
      await deleteMovimiento(token, deleteItem.id);
      setDeleteItem(null);
      fetchMovimientos();
    } catch (err) {
      console.error("Error al eliminar:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (item: MovimientoRow) => {
    const raw = rawMovimientos.find((r) => r.id === item.id);
    if (raw) setEditItem(raw);
  };

  const handleView = (item: MovimientoRow) => {
    const raw = rawMovimientos.find((r) => r.id === item.id);
    if (raw) setViewItem(raw);
  };

  const columns: (keyof MovimientoRow)[] = ["id", "nota", "concepto", "monto", "tipo_movimiento", "cuenta"];
  const columnHeaders: Record<keyof MovimientoRow, string> = {
    id: "ID",
    fecha: "Fecha",
    nota: "Descripción",
    concepto: "Concepto",
    monto: "Monto",
    cuenta: "Cuenta",
    tipo_movimiento: "Tipo",
  };

  if (isLoading) return <PageLoading />;
  if (error) return <PageError message={error} />;

  return (
    <PageShell>
      <PageHeader
        title="Movimientos"
        description="Aquí podrás registrar y gestionar todos tus movimientos financieros. Filtra por fecha para analizar períodos específicos."
        action={
          <Button
            className="small bg-brand-1 hover:bg-brand-1/90 text-white gap-2"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="h-4 w-4" />
            Registrar movimiento
          </Button>
        }
      />

      <DataTable<MovimientoRow>
        title="Historial de Movimientos"
        data={movimientos}
        columns={columns}
        columnHeaders={columnHeaders}
        columnConfig={{
          id: {
            render: (val) => (
              <span className="font-mono xs text-muted-foreground">#{val}</span>
            ),
          },
          nota: {
            render: (val) => {
              const text = String(val ?? "").trim();
              if (!text) {
                return <span className="xs text-muted-foreground italic">Sin descripción</span>;
              }
              return (
                <span className="block max-w-[220px] truncate" title={text}>
                  {text}
                </span>
              );
            },
          },
          tipo_movimiento: {
            render: (val) => {
              if (val === "Ingreso") {
                return (
                  <div className="flex items-center justify-between w-full">
                    <span>{val}</span>
                    <ArrowDownLeft className="h-4 w-4 text-chart-2" />
                  </div>
                );
              }
              if (val === "Egreso") {
                return (
                  <div className="flex items-center justify-between w-full">
                    <span>{val}</span>
                    <ArrowUpRight className="h-4 w-4 text-destructive" />
                  </div>
                );
              }
              if (val === "Transferencia") {
                return (
                  <div className="flex items-center justify-between w-full">
                    <span>{val}</span>
                    <ArrowRightLeft className="h-4 w-4 text-brand-1" />
                  </div>
                );
              }
              return val;
            },
          },
          monto: {
            align: "right",
            render: (val) => (
              <div className="flex items-center justify-between w-full font-medium tabular-nums text-foreground/80">
                <span className="text-muted-foreground/30 font-normal mr-4">$</span>
                <span>{formatNumber(val)}</span>
              </div>
            ),
          },
        }}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={(item) => setDeleteItem(item)}
        canEdit={(item) => isSameLocalDay(item.fecha)}
        canDelete={(item) => isSameLocalDay(item.fecha)}
        disabledEditHint="Solo se pueden editar movimientos registrados hoy."
        disabledDeleteHint="Solo se pueden eliminar movimientos registrados hoy."
        rowsOnDisplay={8}
        dateFilter={true}
        dateFilterColumn="fecha"
      />

      <MovimientoForm
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={fetchMovimientos}
      />

      <MovimientoEditForm
        open={!!editItem}
        onClose={() => setEditItem(null)}
        onSuccess={fetchMovimientos}
        editItem={
          editItem
            ? {
                id: editItem.id,
                concepto_id: editItem.concepto?.id,
                cuenta_origen_id: editItem.cuenta_origen_id,
                cuenta_destino_id: editItem.cuenta_destino_id,
                monto: editItem.monto,
                nota: editItem.nota,
                fecha: editItem.fecha,
                tipo_movimiento: editItem.concepto?.tipo_movimiento?.nombre,
              }
            : null
        }
      />

      <MovimientoDetailModal
        open={!!viewItem}
        onClose={() => setViewItem(null)}
        item={viewItem}
      />

      <ConfirmDeleteModal
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        itemName={deleteItem?.concepto}
        isLoading={isDeleting}
      />
    </PageShell>
  );
}
