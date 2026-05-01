"use client"

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { CustomTable } from "@/components/custom/custom-table";
import { useAuth } from "@/app/context/AuthContext";
import { Loader2, ArrowUpRight, ArrowDownLeft, ArrowRightLeft, Plus } from "lucide-react";
import { TableRow, TableCell } from "@/components/ui/table";
import { ConceptoForm } from "@/components/forms/concepto-form";
import { ConfirmDeleteModal } from "@/components/forms/confirm-delete-modal";

interface Concepto {
  id: number;
  nombre: string;
  tipo_movimiento: string;
  total_monto: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
};

export default function ConceptosPage() {
  const { token } = useAuth();
  const [conceptos, setConceptos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<{ id: number; nombre: string; tipo_movimiento: string } | null>(null);
  const [deleteItem, setDeleteItem] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchConceptos = useCallback(async () => {
    if (!token) { setIsLoading(false); setError("Usuario no autenticado."); return; }
    setIsLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL;
      const response = await fetch(`${baseUrl}/conceptos`, {
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = errorText;
        try { const e = JSON.parse(errorText); errorMessage = e.message || errorText; } catch { }
        throw new Error(`Error ${response.status}: ${errorMessage}`);
      }
      const data = await response.json();
      setConceptos(Array.isArray(data.data) ? data.data : []);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Ocurrió un error inesperado.");
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
      const baseUrl = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${baseUrl}/conceptos/${deleteItem.id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setDeleteItem(null);
      fetchConceptos();
    } catch (err: any) {
      console.error("Error al eliminar:", err.message);
    } finally {
      setIsDeleting(false);
    }
  };


  if (isLoading) {
    return (
      <section className="mx-auto max-w-4xl px-6 py-20 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-1" />
      </section>
    );
  }

  if (error) {
    return (
      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <h2 className="h2 text-destructive">Error</h2>
        <p className="body text-muted-foreground">{error}</p>
      </section>
    );
  }

  const columns: (keyof Concepto)[] = ["nombre", "total_monto"];
  const columnHeaders: Record<keyof Concepto, string> = {
    id: "ID",
    nombre: "Concepto",
    tipo_movimiento: "Tipo",
    total_monto: "Total Acumulado",
  };

  const renderSection = (title: string, tipo: string, icon: any, colorClass: string) => {
    const filtered = conceptos
      .filter(c => (c.tipo_movimiento?.nombre || "N/A") === tipo)
      .map(c => ({
        id: c.id,
        nombre: c.nombre,
        tipo_movimiento: c.tipo_movimiento?.nombre || "N/A",
        total_monto: Number(c.total_monto) || 0
      }));

    const totalNumeric = filtered.reduce((acc, curr) => acc + curr.total_monto, 0);

    const Icon = icon;

    return (
      <CustomTable<Concepto>
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
                <span>{new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)}</span>
              </div>
            )
          }
        }}
        onEdit={(item) => setEditItem({ id: item.id, nombre: item.nombre, tipo_movimiento: item.tipo_movimiento })}
        onDelete={(item) => setDeleteItem(item)}
        footer={
          <TableRow className="bg-muted/10 font-bold border-t-2">
            <TableCell>TOTAL</TableCell>
            <TableCell className={`text-right ${colorClass}`}>
              {formatCurrency(totalNumeric)}
            </TableCell>
          </TableRow>
        }
      />
    );
  };

  return (
    <section className="mx-auto max-w-5xl px-4 md:px-6 py-12 md:py-16 bg-background text-foreground">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="h1 mb-2">Conceptos</h1>
          <p className="body text-muted-foreground max-w-2xl">
            Gestiona tus categorías y visualiza el total acumulado en cada una.
          </p>
        </div>
        <Button
          className="small mt-4 md:mt-0 bg-brand-1 hover:bg-brand-1/90 text-white gap-2"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="h-4 w-4" />
          Nuevo Concepto
        </Button>
      </div>

      <div className="space-y-10">
        {renderSection("Conceptos de Ingreso", "Ingreso", ArrowDownLeft, "text-chart-2")}
        {renderSection("Conceptos de Transferencia", "Transferencia", ArrowRightLeft, "text-brand-1")}
        {renderSection("Conceptos de Egreso", "Egreso", ArrowUpRight, "text-destructive")}
      </div>

      {/* Modales */}
      <ConceptoForm
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={fetchConceptos}
      />
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
    </section>
  );
}
