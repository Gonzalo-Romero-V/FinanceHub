"use client"

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { CustomTable } from "@/components/custom/custom-table";
import { useAuth } from "@/app/context/AuthContext";
import { Loader2, ArrowUpRight, ArrowDownLeft, ArrowRightLeft, Plus } from "lucide-react";
import { MovimientoForm } from "@/components/forms/movimiento-form";
import { MovimientoEditForm } from "@/components/forms/movimiento-edit-form";
import { ConfirmDeleteModal } from "@/components/forms/confirm-delete-modal";

// Definimos el tipo para un movimiento en la tabla
interface Movimiento {
  id: number;
  fecha: string;
  concepto: string;
  monto: number;
  cuenta: string;
  tipo_movimiento: 'Ingreso' | 'Egreso' | 'Transferencia';
}

// Tipo interno con datos crudos del API para formularios
interface MovimientoRaw {
  id: number;
  fecha: string;
  concepto_id?: number;
  cuenta_origen_id?: number;
  cuenta_destino_id?: number;
  monto: number;
  nota?: string;
  concepto?: { id: number; nombre: string; tipo_movimiento?: { nombre: string } };
  cuenta_origen?: { nombre: string };
  cuenta_destino?: { nombre: string };
}

export default function MovimientosPage() {
  const { token } = useAuth();
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [rawMovimientos, setRawMovimientos] = useState<MovimientoRaw[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<MovimientoRaw | null>(null);
  const [deleteItem, setDeleteItem] = useState<Movimiento | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchMovimientos = useCallback(async () => {
    if (!token) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL;
      const response = await fetch(`${baseUrl}/movimientos`, {
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error(`Error ${response.status}`);

      const data = await response.json();
      const arrayData: MovimientoRaw[] = Array.isArray(data.data) ? data.data : [];
      setRawMovimientos(arrayData);

      const formatted: Movimiento[] = arrayData.map((item) => {
        const tipo = item.concepto?.tipo_movimiento?.nombre as Movimiento['tipo_movimiento'] ?? 'Egreso';
        const cuentaOrigen = item.cuenta_origen?.nombre ?? 'N/A';
        const cuentaDestino = item.cuenta_destino?.nombre ?? 'N/A';

        let cuenta: string;
        if (tipo === 'Ingreso') cuenta = cuentaDestino;
        else if (tipo === 'Transferencia') cuenta = `${cuentaOrigen} / ${cuentaDestino}`;
        else cuenta = cuentaOrigen;

        return {
          id: item.id,
          fecha: item.fecha,
          concepto: item.concepto?.nombre ?? 'N/A',
          monto: Number(item.monto) || 0,
          cuenta,
          tipo_movimiento: tipo,
        };
      });
      setMovimientos(formatted);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Ocurrió un error inesperado.");
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
      const baseUrl = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${baseUrl}/movimientos/${deleteItem.id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setDeleteItem(null);
      fetchMovimientos();
    } catch (err: any) {
      console.error("Error al eliminar:", err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (item: Movimiento) => {
    const raw = rawMovimientos.find((r) => r.id === item.id);
    if (raw) setEditItem(raw);
  };

  const columns: (keyof Movimiento)[] = ['fecha', 'concepto', 'monto', 'cuenta', 'tipo_movimiento'];
  const columnHeaders: Record<keyof Movimiento, string> = {
    id: "ID", fecha: "Fecha", concepto: "Concepto", monto: "Monto", cuenta: "Cuenta", tipo_movimiento: "Tipo",
  };

  if (isLoading) return (
    <section className="mx-auto max-w-4xl px-6 py-20 flex justify-center items-center">
      <Loader2 className="h-8 w-8 animate-spin text-brand-1" />
    </section>
  );

  if (error) return (
    <section className="mx-auto max-w-4xl px-6 py-20 text-center">
      <h2 className="h2 text-destructive">Error</h2>
      <p className="body text-muted-foreground">{error}</p>
    </section>
  );

  return (
    <section className="mx-auto max-w-5xl px-4 md:px-6 py-12 md:py-16 bg-background text-foreground">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="h1 mb-2">Movimientos</h1>
          <p className="body text-muted-foreground max-w-2xl">
            Aquí podrás registrar y gestionar todos tus movimientos financieros.
            Filtra por fecha para analizar períodos específicos.
          </p>
        </div>
        <Button
          className="small mt-4 md:mt-0 bg-brand-1 hover:bg-brand-1/90 text-white gap-2"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="h-4 w-4" />
          Registrar movimiento
        </Button>
      </div>

      <CustomTable<Movimiento>
        title="Historial de Movimientos"
        data={movimientos}
        columns={columns}
        columnHeaders={columnHeaders}
        columnConfig={{
          fecha: {
            render: (val) => {
              const dateStr = String(val).split('T')[0].split(' ')[0];
              const [y, m, d] = dateStr.split('-').map(Number);
              return new Date(y, m - 1, d).toLocaleDateString('es-ES', { 
                year: 'numeric', month: '2-digit', day: '2-digit' 
              });
            }
          },
          tipo_movimiento: {
            render: (val) => {
              if (val === 'Ingreso') return (
                <div className="flex items-center justify-between w-full">
                  <span>{val}</span>
                  <ArrowDownLeft className="h-4 w-4 text-chart-2" />
                </div>
              );
              if (val === 'Egreso') return (
                <div className="flex items-center justify-between w-full">
                  <span>{val}</span>
                  <ArrowUpRight className="h-4 w-4 text-destructive" />
                </div>
              );
              if (val === 'Transferencia') return (
                <div className="flex items-center justify-between w-full">
                  <span>{val}</span>
                  <ArrowRightLeft className="h-4 w-4 text-brand-1" />
                </div>
              );
              return val;
            }
          },
          monto: {
            align: "right",
            render: (val) => (
              <div className="flex items-center justify-between w-full font-medium tabular-nums text-foreground/80">
                <span className="text-muted-foreground/30 font-normal mr-4">$</span>
                <span>{new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)}</span>
              </div>
            )
          }
        }}
        onEdit={handleEdit}
        onDelete={(item) => setDeleteItem(item)}
        rowsOnDisplay={8}
        dateFilter={true}
        dateFilterColumn="fecha"
      />

      {/* Modales */}
      <MovimientoForm
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={fetchMovimientos}
      />

      <MovimientoEditForm
        open={!!editItem}
        onClose={() => setEditItem(null)}
        onSuccess={fetchMovimientos}
        editItem={editItem ? {
          id: editItem.id,
          concepto_id: editItem.concepto?.id,
          cuenta_origen_id: editItem.cuenta_origen_id,
          cuenta_destino_id: editItem.cuenta_destino_id,
          monto: editItem.monto,
          nota: editItem.nota,
          fecha: editItem.fecha,
          tipo_movimiento: editItem.concepto?.tipo_movimiento?.nombre,
        } : null}
      />

      <ConfirmDeleteModal
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        itemName={deleteItem?.concepto}
        isLoading={isDeleting}
      />
    </section>
  );
}
