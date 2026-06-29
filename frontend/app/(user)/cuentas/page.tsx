"use client";

import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, TrendingUp, TrendingDown, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TableRow, TableCell } from "@/components/ui/table";
import { DataTable } from "@/components/custom/data-table";
import { BalanceGeneral } from "@/components/custom/balance-general";
import { HistorialBalance } from "@/components/custom/historial-balance";
import { PageShell } from "@/components/custom/page-shell";
import { PageHeader } from "@/components/custom/page-header";
import { PageLoading, PageError } from "@/components/custom/page-state";
import { CuentaForm } from "@/components/forms/cuenta-form";
import { ConfirmDeleteModal } from "@/components/forms/confirm-delete-modal";
import { ReconciliacionModal } from "@/components/forms/reconciliacion-modal";

import { useAuth } from "@/lib/auth/context";
import { listCuentas, deleteCuenta, type Cuenta as CuentaApi } from "@/lib/api/cuentas";
import { getUserSettings, type UserSettings } from "@/lib/api/user-settings";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils/format";

interface CuentaRow {
  id: number;
  nombre: string;
  tipo_cuenta: string;
  saldo: number;
  saldo_inicial: number;
  activa: string;
  fecha_creacion: string;
}

function toCuentaRow(item: CuentaApi): CuentaRow {
  return {
    id: item.id,
    nombre: item.nombre,
    tipo_cuenta: (item.tipoCuenta?.nombre || item.tipo_cuenta?.nombre) ?? "N/A",
    saldo: Number(item.saldo) || 0,
    saldo_inicial: Number(item.saldo_inicial) || 0,
    activa: item.activa ? "Activa" : "Inactiva",
    fecha_creacion: formatDate(item.fecha_creacion),
  };
}

export default function CuentasPage() {
  const { token } = useAuth();
  const [cuentas, setCuentas] = useState<CuentaRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [historialRefresh, setHistorialRefresh] = useState(0);

  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<CuentaRow | null>(null);
  const [deleteItem, setDeleteItem] = useState<CuentaRow | null>(null);
  const [reconciliarItem, setReconciliarItem] = useState<{ id: number; nombre: string; saldo: number } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCuentas = useCallback(async () => {
    if (!token) { setIsLoading(false); setError("Usuario no autenticado."); return; }
    setIsLoading(true);
    try {
      const [cuentasRes, settingsRes] = await Promise.all([
        listCuentas(token),
        getUserSettings(token).catch(() => null),
      ]);
      setCuentas((Array.isArray(cuentasRes.data) ? cuentasRes.data : []).map(toCuentaRow));
      setSettings(settingsRes?.data ?? null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchCuentas(); }, [fetchCuentas]);

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

  const handleReconciliacionSuccess = () => {
    fetchCuentas();
    setHistorialRefresh((n) => n + 1);
  };

  const alertaVencida =
    settings?.reconciliacion_proxima &&
    new Date(settings.reconciliacion_proxima) <= new Date();

  const totalActivos = cuentas.filter((c) => c.tipo_cuenta === "Activo").reduce((acc, c) => acc + c.saldo, 0);
  const totalPasivos = cuentas.filter((c) => c.tipo_cuenta === "Pasivo").reduce((acc, c) => acc + c.saldo, 0);

  const columns: (keyof CuentaRow)[] = ["nombre", "tipo_cuenta", "saldo", "activa", "fecha_creacion"];
  const columnHeaders: Record<keyof CuentaRow, string> = {
    id: "ID",
    nombre: "Nombre",
    tipo_cuenta: "Tipo",
    saldo: "Saldo",
    saldo_inicial: "Saldo inicial",
    activa: "Estado",
    fecha_creacion: "Fecha creación",
  };

  if (isLoading) return <PageLoading />;
  if (error) return <PageError message={error} />;

  const cuentasParaHistorial = cuentas.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    saldo_inicial: c.saldo_inicial,
    saldo: c.saldo,
  }));

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
        onReconciliar={(item) =>
          setReconciliarItem({ id: item.id, nombre: item.nombre, saldo: item.saldo })
        }
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

      {alertaVencida && (
        <div className="flex items-center gap-3 rounded-lg border border-chart-4/30 bg-chart-4/10 px-4 py-3 mb-4">
          <AlertTriangle className="h-4 w-4 text-chart-4 shrink-0" />
          <p className="text-sm text-chart-4">
            Tenés una reconciliación pendiente desde el{" "}
            <span className="font-semibold">
              {new Date(settings!.reconciliacion_proxima!).toLocaleDateString("es")}
            </span>
            . Usá el ícono <span className="font-semibold">⚖</span> en cada cuenta para conciliarla.
          </p>
        </div>
      )}

      <BalanceGeneral totalActivos={totalActivos} totalPasivos={totalPasivos} />

      <HistorialBalance cuentas={cuentasParaHistorial} onRefresh={historialRefresh} />

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
      <ReconciliacionModal
        open={!!reconciliarItem}
        onClose={() => setReconciliarItem(null)}
        onSuccess={handleReconciliacionSuccess}
        cuenta={reconciliarItem}
      />
    </PageShell>
  );
}
