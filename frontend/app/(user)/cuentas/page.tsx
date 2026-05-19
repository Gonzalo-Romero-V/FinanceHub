"use client";

import { useState, useEffect, useCallback } from "react";
import { TrendingUp, TrendingDown, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TableRow, TableCell } from "@/components/ui/table";
import { DataTable } from "@/components/custom/data-table";
import { BalanceGeneral } from "@/components/custom/balance-general";
import { PageShell } from "@/components/custom/page-shell";
import { PageHeader } from "@/components/custom/page-header";
import { PageLoading, PageError } from "@/components/custom/page-state";
import { CuentaForm } from "@/components/forms/cuenta-form";
import { ConfirmDeleteModal } from "@/components/forms/confirm-delete-modal";

import { useAuth } from "@/lib/auth/context";
import { listCuentas, deleteCuenta, type Cuenta as CuentaApi } from "@/lib/api/cuentas";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils/format";

interface CuentaRow {
  id: number;
  nombre: string;
  tipo_cuenta: string;
  saldo: number;
  activa: string;
  fecha_creacion: string;
}

function toCuentaRow(item: CuentaApi): CuentaRow {
  return {
    id: item.id,
    nombre: item.nombre,
    tipo_cuenta: (item.tipoCuenta?.nombre || item.tipo_cuenta?.nombre) ?? "N/A",
    saldo: Number(item.saldo) || 0,
    activa: item.activa ? "Activa" : "Inactiva",
    fecha_creacion: formatDate(item.fecha_creacion),
  };
}

export default function CuentasPage() {
  const { token } = useAuth();
  const [cuentas, setCuentas] = useState<CuentaRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<CuentaRow | null>(null);
  const [deleteItem, setDeleteItem] = useState<CuentaRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCuentas = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      setError("Usuario no autenticado.");
      return;
    }
    setIsLoading(true);
    try {
      const response = await listCuentas(token);
      const arrayData = Array.isArray(response.data) ? response.data : [];
      setCuentas(arrayData.map(toCuentaRow));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchCuentas();
  }, [fetchCuentas]);

  const handleDelete = async () => {
    if (!deleteItem || !token) return;
    setIsDeleting(true);
    try {
      await deleteCuenta(token, deleteItem.id);
      setDeleteItem(null);
      fetchCuentas();
    } catch (err) {
      console.error("Error al eliminar:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const totalActivos = cuentas
    .filter((c) => c.tipo_cuenta === "Activo")
    .reduce((acc, c) => acc + c.saldo, 0);

  const totalPasivos = cuentas
    .filter((c) => c.tipo_cuenta === "Pasivo")
    .reduce((acc, c) => acc + c.saldo, 0);

  const columns: (keyof CuentaRow)[] = ["nombre", "tipo_cuenta", "saldo", "activa", "fecha_creacion"];
  const columnHeaders: Record<keyof CuentaRow, string> = {
    id: "ID",
    nombre: "Nombre",
    tipo_cuenta: "Tipo",
    saldo: "Saldo",
    activa: "Estado",
    fecha_creacion: "Fecha creación",
  };

  if (isLoading) return <PageLoading />;
  if (error) return <PageError message={error} />;

  const renderSection = (title: string, tipo: string, icon: typeof TrendingUp, colorClass: string) => {
    const filtered = cuentas.filter((c) => c.tipo_cuenta === tipo);
    const totalNumeric = filtered.reduce((acc, curr) => acc + curr.saldo, 0);
    const Icon = icon;

    return (
      <DataTable<CuentaRow>
        title={title}
        titleIcon={<Icon className={`w-5 h-5 ${colorClass}`} />}
        data={filtered}
        columns={columns}
        columnHeaders={columnHeaders}
        columnConfig={{
          saldo: {
            align: "right",
            render: (val) => (
              <div className="flex items-center justify-between w-full font-medium tabular-nums text-foreground/80">
                <span className="text-muted-foreground/30 font-normal mr-4">$</span>
                <span>{formatNumber(val)}</span>
              </div>
            ),
          },
        }}
        onEdit={(item) => setEditItem(item)}
        onDelete={(item) => setDeleteItem(item)}
        rowsOnDisplay={8}
        dateFilter={false}
        footer={
          <TableRow className="bg-muted/10 font-bold border-t-2">
            <TableCell colSpan={2}>TOTAL {title.toUpperCase()}</TableCell>
            <TableCell className={`text-right ${colorClass}`}>{formatCurrency(totalNumeric)}</TableCell>
            <TableCell colSpan={3}></TableCell>
          </TableRow>
        }
      />
    );
  };

  return (
    <PageShell>
      <PageHeader
        title="Cuentas"
        description="Gestiona tus cuentas financieras. Visualiza saldos, estados y tipos de cuenta."
        action={
          <Button
            className="small bg-brand-1 hover:bg-brand-1/90 text-white gap-2"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="h-4 w-4" />
            Agregar Cuenta
          </Button>
        }
      />

      <BalanceGeneral totalActivos={totalActivos} totalPasivos={totalPasivos} />

      <div className="space-y-10 mt-10">
        {renderSection("Cuentas de Activos", "Activo", TrendingUp, "text-chart-2")}
        {renderSection("Cuentas de Pasivos", "Pasivo", TrendingDown, "text-destructive")}
      </div>

      <CuentaForm open={showCreate} onClose={() => setShowCreate(false)} onSuccess={fetchCuentas} />
      <CuentaForm
        open={!!editItem}
        onClose={() => setEditItem(null)}
        onSuccess={fetchCuentas}
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
