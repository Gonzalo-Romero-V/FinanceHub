"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowUpRight, ArrowDownLeft, ArrowRightLeft, Plus, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TableRow, TableCell } from "@/components/ui/table";
import { DataTable } from "@/components/custom/data-table";
import { PageShell } from "@/components/custom/page-shell";
import { PageHeader } from "@/components/custom/page-header";
import { PageLoading, PageError } from "@/components/custom/page-state";
import { ConceptoForm } from "@/components/forms/concepto-form";
import { ConfirmDeleteModal } from "@/components/forms/confirm-delete-modal";

import { useAuth } from "@/lib/auth/context";
import { listConceptos, deleteConcepto, type Concepto as ConceptoApi } from "@/lib/api/conceptos";
import { formatCurrency, formatNumber } from "@/lib/utils/format";

interface ConceptoRow {
  id: number;
  nombre: string;
  tipo_movimiento: string;
  total_monto: number;
}

export default function ConceptosPage() {
  const { token } = useAuth();
  const [conceptos, setConceptos] = useState<ConceptoApi[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<{ id: number; nombre: string; tipo_movimiento: string } | null>(null);
  const [deleteItem, setDeleteItem] = useState<ConceptoRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchConceptos = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      setError("Usuario no autenticado.");
      return;
    }
    setIsLoading(true);
    try {
      const response = await listConceptos(token);
      setConceptos(Array.isArray(response.data) ? response.data : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchConceptos();
  }, [fetchConceptos]);

  const handleDelete = async () => {
    if (!deleteItem || !token) return;
    setIsDeleting(true);
    try {
      await deleteConcepto(token, deleteItem.id);
      setDeleteItem(null);
      fetchConceptos();
    } catch (err) {
      console.error("Error al eliminar:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) return <PageLoading />;
  if (error) return <PageError message={error} />;

  const columns: (keyof ConceptoRow)[] = ["nombre", "total_monto"];
  const columnHeaders: Record<keyof ConceptoRow, string> = {
    id: "ID",
    nombre: "Concepto",
    tipo_movimiento: "Tipo",
    total_monto: "Total Acumulado",
  };

  const renderSection = (title: string, tipo: string, icon: LucideIcon, colorClass: string) => {
    const filtered: ConceptoRow[] = conceptos
      .filter((c) => (c.tipo_movimiento?.nombre || "N/A") === tipo)
      .map((c) => ({
        id: c.id,
        nombre: c.nombre,
        tipo_movimiento: c.tipo_movimiento?.nombre || "N/A",
        total_monto: Number(c.total_monto) || 0,
      }));

    const totalNumeric = filtered.reduce((acc, curr) => acc + curr.total_monto, 0);
    const Icon = icon;

    return (
      <DataTable<ConceptoRow>
        title={title}
        titleIcon={<Icon className={`w-5 h-5 ${colorClass}`} />}
        data={filtered}
        columns={columns}
        columnHeaders={columnHeaders}
        columnConfig={{
          total_monto: {
            align: "right",
            render: (val) => (
              <div className="flex items-center justify-between w-full font-medium tabular-nums text-foreground/80">
                <span className="text-muted-foreground/30 font-normal mr-4">$</span>
                <span>{formatNumber(val)}</span>
              </div>
            ),
          },
        }}
        onEdit={(item) =>
          setEditItem({ id: item.id, nombre: item.nombre, tipo_movimiento: item.tipo_movimiento })
        }
        onDelete={(item) => setDeleteItem(item)}
        footer={
          <TableRow className="bg-muted/10 font-bold border-t-2">
            <TableCell>TOTAL</TableCell>
            <TableCell className={`text-right ${colorClass}`}>{formatCurrency(totalNumeric)}</TableCell>
          </TableRow>
        }
      />
    );
  };

  return (
    <PageShell>
      <PageHeader
        title="Conceptos"
        description="Gestiona tus categorías y visualiza el total acumulado en cada una."
        action={
          <Button
            className="small bg-brand-1 hover:bg-brand-1/90 text-white gap-2"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="h-4 w-4" />
            Nuevo Concepto
          </Button>
        }
      />

      <div className="space-y-10">
        {renderSection("Conceptos de Ingreso", "Ingreso", ArrowDownLeft, "text-chart-2")}
        {renderSection("Conceptos de Transferencia", "Transferencia", ArrowRightLeft, "text-brand-1")}
        {renderSection("Conceptos de Egreso", "Egreso", ArrowUpRight, "text-destructive")}
      </div>

      <ConceptoForm open={showCreate} onClose={() => setShowCreate(false)} onSuccess={fetchConceptos} />
      <ConceptoForm
        open={!!editItem}
        onClose={() => setEditItem(null)}
        onSuccess={fetchConceptos}
        editItem={editItem}
      />
      <ConfirmDeleteModal
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        itemName={deleteItem?.nombre}
        isLoading={isDeleting}
      />
    </PageShell>
  );
}
