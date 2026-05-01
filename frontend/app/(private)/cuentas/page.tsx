"use client"

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { CustomTable } from "@/components/custom/custom-table";
import { useAuth } from "@/app/context/AuthContext";
import { Loader2, TrendingUp, TrendingDown, Plus } from "lucide-react";
import { BalanceGeneral } from "@/components/custom/balance-general";
import { TableRow, TableCell } from "@/components/ui/table";
import { CuentaForm } from "@/components/forms/cuenta-form";
import { ConfirmDeleteModal } from "@/components/forms/confirm-delete-modal";

interface Cuenta {
  id: number;
  nombre: string;
  tipo_cuenta: string;
  saldo: number;
  activa: string;
  fecha_creacion: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
};

export default function CuentasPage() {
  const { token } = useAuth();
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<Cuenta | null>(null);
  const [deleteItem, setDeleteItem] = useState<Cuenta | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCuentas = useCallback(async () => {
    if (!token) { setIsLoading(false); setError("Usuario no autenticado."); return; }
    setIsLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL;
      const response = await fetch(`${baseUrl}/cuentas`, {
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = errorText;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorText;
        } catch { }
        throw new Error(`Error ${response.status}: ${errorMessage}`);
      }
      const data = await response.json();
      const arrayData = Array.isArray(data.data) ? data.data : [];
      const formattedData: Cuenta[] = arrayData.map((item: any) => ({
        id: item.id,
        nombre: item.nombre,
        tipo_cuenta: (item.tipoCuenta?.nombre || item.tipo_cuenta?.nombre) ?? "N/A",
        saldo: Number(item.saldo) || 0,
        activa: item.activa ? "Activa" : "Inactiva",
        fecha_creacion: new Date(item.fecha_creacion).toLocaleDateString("es-ES"),
      }));
      setCuentas(formattedData);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Ocurrió un error inesperado.");
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
      const baseUrl = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${baseUrl}/cuentas/${deleteItem.id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setDeleteItem(null);
      fetchCuentas();
    } catch (err: any) {
      console.error("Error al eliminar:", err.message);
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

  const columns: (keyof Cuenta)[] = [
    "nombre",
    "tipo_cuenta",
    "saldo",
    "activa",
    "fecha_creacion"
  ];

  const columnHeaders: Record<keyof Cuenta, string> = {
    id: "ID",
    nombre: "Nombre",
    tipo_cuenta: "Tipo",
    saldo: "Saldo",
    activa: "Estado",
    fecha_creacion: "Fecha creación",
  };

  if (isLoading) {
    return (
      <section className="mx-auto max-w-4xl px-6 py-20 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-1" />
      </section>
    )
  }

  if (error) {
    return (
      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <h2 className="h2 text-destructive">Error</h2>
        <p className="body text-muted-foreground">{error}</p>
      </section>
    )
  }

  const renderSection = (title: string, tipo: string, icon: any, colorClass: string) => {
    const filtered = cuentas.filter(c => c.tipo_cuenta === tipo);
    const totalNumeric = filtered.reduce((acc, curr) => acc + curr.saldo, 0);
    const Icon = icon;

    return (
      <CustomTable<Cuenta>
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
                <span>{new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)}</span>
              </div>
            )
          }
        }}
        onEdit={(item) => setEditItem(item)}
        onDelete={(item) => setDeleteItem(item)}
        rowsOnDisplay={8}
        dateFilter={false}
        footer={
          <TableRow className="bg-muted/10 font-bold border-t-2">
            <TableCell colSpan={2}>TOTAL {title.toUpperCase()}</TableCell>
            <TableCell className={`text-right ${colorClass}`}>
              {formatCurrency(totalNumeric)}
            </TableCell>
            <TableCell colSpan={3}></TableCell>
          </TableRow>
        }
      />
    );
  };

  return (
    <section className="mx-auto max-w-5xl px-4 md:px-6 py-12 md:py-16 bg-background text-foreground">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="h1 mb-2">Cuentas</h1>
          <p className="body text-muted-foreground max-w-2xl">
            Gestiona tus cuentas financieras. Visualiza saldos, estados y tipos de cuenta.
          </p>
        </div>

        <Button
          className="small mt-4 md:mt-0 bg-brand-1 hover:bg-brand-1/90 text-white gap-2"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="h-4 w-4" />
          Agregar Cuenta
        </Button>
      </div>

      <BalanceGeneral totalActivos={totalActivos} totalPasivos={totalPasivos} />

      <div className="space-y-10 mt-10">
        {renderSection("Cuentas de Activos", "Activo", TrendingUp, "text-chart-2")}
        {renderSection("Cuentas de Pasivos", "Pasivo", TrendingDown, "text-destructive")}
      </div>

      {/* Modales */}
      <CuentaForm
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={fetchCuentas}
      />
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
    </section>
  )
}
