"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Plus,
  Eye,
  Pencil,
  Trash2,
  CreditCard,
  MoreVertical,
  CheckCircle2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DataTable } from "@/components/custom/data-table";
import { BalanceGeneral } from "@/components/custom/balance-general";
import { HistorialBalance } from "@/components/custom/historial-balance";
import { PageShell } from "@/components/custom/page-shell";
import { PageHeader } from "@/components/custom/page-header";
import { PageLoading, PageError } from "@/components/custom/page-state";
import { CuentaForm } from "@/components/forms/cuenta-form";
import { ConfirmDeleteModal } from "@/components/forms/confirm-delete-modal";
import { ReconciliacionModal } from "@/components/forms/reconciliacion-modal";
import { DeudaForm } from "@/components/forms/deuda-form";
import { DeudaDetailModal } from "@/components/forms/deuda-detail-modal";
import { PagoCuotaModal } from "@/components/forms/pago-cuota-modal";
import { CoachMark } from "@/components/onboarding/coach-mark";

import { useAuth } from "@/lib/auth/context";
import { useOnboarding } from "@/lib/onboarding/context";
import { listCuentas, deleteCuenta, type Cuenta as CuentaApi } from "@/lib/api/cuentas";
import { getBalance, type Balance } from "@/lib/api/balance";
import {
  listDeudas,
  deleteDeuda as apiDeleteDeuda,
  SISTEMA_LABELS,
  type Deuda,
  type Cuota,
} from "@/lib/api/deudas";
import { formatCurrency, formatDate, formatNumber, todayIsoDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { notifyError } from "@/lib/ui/notify";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CuentaRow {
  id: number;
  nombre: string;
  tipo_cuenta: string;
  saldo: number;
  saldo_inicial: number;
  activa: string;
  fecha_creacion: string;
  fecha_creacion_raw: string;
  color: string | null;
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
    fecha_creacion_raw: item.fecha_creacion,
    color: item.color,
  };
}

// ─── Helpers de estilo para deudas ───────────────────────────────────────────

function sistemaBadgeClass(sistema: string) {
  if (sistema === "frances") return "bg-brand-1/10 text-brand-1";
  if (sistema === "aleman") return "bg-chart-2/10 text-chart-2";
  return "bg-chart-4/10 text-chart-4";
}

// ─── Tabla de deudas (estilo DataTable) ──────────────────────────────────────

function DeudasTable({
  deudas,
  onVerTabla,
  onPagarCuota,
  onEdit,
  onDelete,
}: {
  deudas: Deuda[];
  onVerTabla: (d: Deuda) => void;
  onPagarCuota: (d: Deuda) => void;
  onEdit: (d: Deuda) => void;
  onDelete: (d: Deuda) => void;
}) {
  const hoy = todayIsoDate();
  const totalSaldo = deudas
    .filter((d) => d.estado === "activa")
    .reduce((acc, d) => acc + d.saldo_pendiente, 0);

  return (
    <div className="w-full bg-background">
      <div className="relative bg-transparent" style={{ height: "350px", overflowY: "auto" }}>
        <Table>
          <TableHeader className="sticky top-0 bg-muted/30 backdrop-blur-sm z-10">
            <TableRow className="hover:bg-transparent border-b">
              <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/70 font-bold">
                Nombre
              </TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/70 font-bold">
                Sistema
              </TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/70 font-bold text-right">
                Capital
              </TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/70 font-bold min-w-[140px]">
                Progreso
              </TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/70 font-bold text-right">
                Saldo pendiente
              </TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/70 font-bold">
                Próxima cuota
              </TableHead>
              <TableHead className="w-[90px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {deudas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground small">
                  No hay deudas registradas.
                </TableCell>
              </TableRow>
            ) : (
              deudas.map((deuda) => {
                const proxima = deuda.proxima_cuota;
                const hayVencidas = deuda.cuotas.some(
                  (c) => !c.pagada && c.fecha_vencimiento < hoy,
                );
                const puedeP = proxima && deuda.estado === "activa";

                return (
                  <TableRow
                    key={deuda.id}
                    className={cn(
                      "group transition-colors border-b border-border/50",
                      deuda.estado !== "activa" && "opacity-60",
                    )}
                  >
                    {/* Nombre */}
                    <TableCell className="py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-foreground">{deuda.nombre}</span>
                        {deuda.acreedor && (
                          <span className="xs text-muted-foreground">{deuda.acreedor}</span>
                        )}
                        {hayVencidas && deuda.estado === "activa" && (
                          <span className="xs text-destructive font-medium">Cuotas vencidas</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Sistema */}
                    <TableCell className="py-3">
                      <span
                        className={cn(
                          "xs font-semibold px-2 py-0.5 rounded-md uppercase tracking-wide",
                          sistemaBadgeClass(deuda.sistema),
                        )}
                      >
                        {SISTEMA_LABELS[deuda.sistema]}
                      </span>
                    </TableCell>

                    {/* Capital */}
                    <TableCell className="py-3 text-right tabular-nums text-foreground/80">
                      {formatCurrency(deuda.monto_original)}
                    </TableCell>

                    {/* Progreso */}
                    <TableCell className="py-3">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between xs">
                          <span className="text-muted-foreground">
                            {deuda.cuotas_pagadas}/{deuda.total_cuotas} cuotas
                          </span>
                          <span className="font-semibold text-brand-1">{deuda.progreso_pct}%</span>
                        </div>
                        <div className="w-full bg-muted/50 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full bg-brand-1 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(deuda.progreso_pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>

                    {/* Saldo pendiente */}
                    <TableCell className="py-3 text-right">
                      {deuda.estado === "pagada" ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-chart-3" />
                          <span className="xs text-chart-3 font-semibold">Saldada</span>
                        </div>
                      ) : (
                        <span className="font-semibold tabular-nums text-destructive">
                          {formatCurrency(deuda.saldo_pendiente)}
                        </span>
                      )}
                    </TableCell>

                    {/* Próxima cuota */}
                    <TableCell className="py-3">
                      {proxima && deuda.estado === "activa" ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="xs text-muted-foreground">
                            #{proxima.numero_cuota} · {formatDate(proxima.fecha_vencimiento)}
                          </span>
                          <span
                            className={cn(
                              "small font-semibold tabular-nums",
                              proxima.fecha_vencimiento < hoy ? "text-destructive" : "",
                            )}
                          >
                            {formatCurrency(proxima.cuota_total)}
                          </span>
                        </div>
                      ) : (
                        <span className="xs text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* Acciones */}
                    <TableCell className="w-[90px] text-right">
                      {/* Desktop */}
                      <div className="hidden md:flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-brand-1 hover:bg-brand-1/10"
                          onClick={() => onVerTabla(deuda)}
                          title="Ver tabla de amortización"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {puedeP && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-chart-3 hover:bg-chart-3/10"
                            onClick={() => onPagarCuota(deuda)}
                            title="Pagar próxima cuota"
                          >
                            <CreditCard className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-brand-1 hover:bg-brand-1/10"
                          onClick={() => onEdit(deuda)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => onDelete(deuda)}
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Mobile */}
                      <div className="flex md:hidden items-center justify-end">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-48 p-1" align="end">
                            <div className="flex flex-col gap-1">
                              <Button
                                variant="ghost"
                                className="justify-start gap-2 h-9 px-2 small"
                                onClick={() => onVerTabla(deuda)}
                              >
                                <Eye className="h-4 w-4" />
                                Ver tabla
                              </Button>
                              {puedeP && (
                                <Button
                                  variant="ghost"
                                  className="justify-start gap-2 h-9 px-2 small text-chart-3 hover:text-chart-3 hover:bg-chart-3/10"
                                  onClick={() => onPagarCuota(deuda)}
                                >
                                  <CreditCard className="h-4 w-4" />
                                  Pagar cuota
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                className="justify-start gap-2 h-9 px-2 small"
                                onClick={() => onEdit(deuda)}
                              >
                                <Pencil className="h-4 w-4" />
                                Editar
                              </Button>
                              <Button
                                variant="ghost"
                                className="justify-start gap-2 h-9 px-2 small text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => onDelete(deuda)}
                              >
                                <Trash2 className="h-4 w-4" />
                                Eliminar
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}

            {/* Footer total */}
            <TableRow className="bg-muted/10 font-bold border-t-2">
              <TableCell colSpan={4}>TOTAL PASIVOS (DEUDAS ACTIVAS)</TableCell>
              <TableCell className="text-right text-destructive">
                {formatCurrency(totalSaldo)}
              </TableCell>
              <TableCell colSpan={2} />
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function CuentasPage() {
  const { token } = useAuth();
  const { isSeen } = useOnboarding();

  // ── Cuentas ──
  const [cuentas, setCuentas] = useState<CuentaRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [historialRefresh, setHistorialRefresh] = useState(0);

  const searchParams = useSearchParams();
  const [showCreate, setShowCreate] = useState(false);

  // Soporta ?crear=1 (ej. desde el CTA final del carrusel de bienvenida) para
  // abrir el formulario de alta directamente al llegar a la página.
  useEffect(() => {
    if (searchParams.get("crear") === "1") setShowCreate(true);
  }, [searchParams]);

  const [editItem, setEditItem] = useState<CuentaRow | null>(null);
  const [deleteItem, setDeleteItem] = useState<CuentaRow | null>(null);
  const [reconciliarItem, setReconciliarItem] = useState<{
    id: number;
    nombre: string;
    saldo: number;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Deudas ──
  const [deudas, setDeudas] = useState<Deuda[]>([]);
  const [isLoadingDeudas, setIsLoadingDeudas] = useState(true);
  const [showCreateDeuda, setShowCreateDeuda] = useState(false);
  const [editDeuda, setEditDeuda] = useState<Deuda | null>(null);
  const [deleteDeuda, setDeleteDeuda] = useState<Deuda | null>(null);
  const [detailDeuda, setDetailDeuda] = useState<Deuda | null>(null);
  const [pagoDeuda, setPagoDeuda] = useState<{
    cuota: Cuota;
    deudaId: number;
    deudaNombre: string;
  } | null>(null);
  const [isDeletingDeuda, setIsDeletingDeuda] = useState(false);

  // ── Fetch ──
  const fetchCuentas = useCallback(async () => {
    if (!token) { setIsLoading(false); setError("Usuario no autenticado."); return; }
    setIsLoading(true);
    try {
      const [cuentasRes, balanceRes] = await Promise.all([
        listCuentas(token),
        getBalance(token),
      ]);
      setCuentas((Array.isArray(cuentasRes.data) ? cuentasRes.data : []).map(toCuentaRow));
      setBalance(balanceRes);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const fetchBalance = useCallback(async () => {
    if (!token) return;
    try {
      setBalance(await getBalance(token));
    } catch (err) {
      console.error("Error al actualizar el balance:", err);
    }
  }, [token]);

  const fetchDeudas = useCallback(async () => {
    if (!token) { setIsLoadingDeudas(false); return; }
    setIsLoadingDeudas(true);
    try {
      const res = await listDeudas(token);
      const data = Array.isArray(res.data) ? res.data : [];
      setDeudas(data);
      setDetailDeuda((prev) => prev ? (data.find((d) => d.id === prev.id) ?? null) : null);
    } catch {
      // silencioso: la sección de deudas muestra vacío
    } finally {
      setIsLoadingDeudas(false);
    }
  }, [token]);

  useEffect(() => { fetchCuentas(); }, [fetchCuentas]);
  useEffect(() => { fetchDeudas(); }, [fetchDeudas]);

  // ── Handlers cuentas ──
  const handleDeleteCuenta = async () => {
    if (!deleteItem || !token) return;
    setIsDeleting(true);
    try {
      await deleteCuenta(token, deleteItem.id);
      setDeleteItem(null);
      fetchCuentas();
    } catch (err) {
      console.error("Error al eliminar:", err);
      notifyError(err instanceof Error ? err.message : "No se pudo eliminar la cuenta.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReconciliacionSuccess = () => {
    fetchCuentas();
    setHistorialRefresh((n) => n + 1);
  };

  // ── Handlers deudas ──
  const handleDeleteDeuda = async () => {
    if (!deleteDeuda || !token) return;
    setIsDeletingDeuda(true);
    try {
      await apiDeleteDeuda(token, deleteDeuda.id);
      setDeleteDeuda(null);
      if (detailDeuda?.id === deleteDeuda.id) setDetailDeuda(null);
      void fetchDeudas();
      void fetchBalance();
    } catch (err) {
      console.error("Error al eliminar deuda:", err);
      notifyError(err instanceof Error ? err.message : "No se pudo eliminar la deuda.");
    } finally {
      setIsDeletingDeuda(false);
    }
  };

  const handlePagarCuota = (cuota: Cuota, deuda: Deuda) => {
    setPagoDeuda({ cuota, deudaId: deuda.id, deudaNombre: deuda.nombre });
  };

  const handleDeudaSuccess = () => {
    void fetchDeudas();
    void fetchBalance();
  };

  // ── Balance ──
  const alertaVencida = balance?.alerta_reconciliacion ?? false;
  const totalActivos = balance?.total_activos ?? 0;
  const totalPasivos = balance?.total_pasivos ?? 0;

  // ── Config tabla activos ──
  const columns: (keyof CuentaRow)[] = ["nombre", "tipo_cuenta", "saldo", "activa", "fecha_creacion"];
  const columnHeaders: Record<keyof CuentaRow, string> = {
    id: "ID",
    nombre: "Nombre",
    tipo_cuenta: "Tipo",
    saldo: "Saldo",
    saldo_inicial: "Saldo inicial",
    activa: "Estado",
    fecha_creacion: "Fecha creación",
    fecha_creacion_raw: "Fecha creación",
    color: "",
  };

  if (isLoading) return <PageLoading />;
  if (error) return <PageError message={error} />;

  const cuentasParaHistorial = cuentas.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    tipo_cuenta: c.tipo_cuenta,
    saldo_inicial: c.saldo_inicial,
    saldo: c.saldo,
    fecha_creacion: c.fecha_creacion_raw,
    color: c.color,
  }));

  const activos = cuentas.filter((c) => c.tipo_cuenta === "Activo");
  const totalActivosNum = activos.reduce((acc, c) => acc + c.saldo, 0);

  return (
    <PageShell>
      <PageHeader
        title="Cuentas"
        description="Gestiona tus cuentas financieras y deudas. Visualiza saldos, estados y tipos de cuenta."
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
            Tienes una reconciliación pendiente desde el{" "}
            <span className="font-semibold">
              {balance?.proxima_reconciliacion
                ? new Date(balance.proxima_reconciliacion).toLocaleDateString("es")
                : "fecha no disponible"}
            </span>
            . Usa el ícono <span className="font-semibold">⚖</span> en cada cuenta para conciliarla.
          </p>
        </div>
      )}

      <CoachMark
        id="balance_general"
        text="Cada movimiento que registras actualiza este número al instante: tu Balance General es Activos menos Pasivos."
        guideHref="/help"
        enabled={isSeen("tipos_movimiento") && isSeen("conceptos")}
      >
        <div>
          <BalanceGeneral totalActivos={totalActivos} totalPasivos={totalPasivos} />
        </div>
      </CoachMark>

      <HistorialBalance cuentas={cuentasParaHistorial} onRefresh={historialRefresh} />

      <div className="space-y-10 mt-10">
        {/* Activos */}
        <CoachMark
          id="cuentas_activos"
          text="Aquí van tus cuentas con dinero disponible: banco, efectivo, ahorros. Suma al menos una para empezar."
          guideHref="/help"
        >
        <div>
        <DataTable<CuentaRow>
          title="Activos"
          titleIcon={<TrendingUp className="w-5 h-5 text-chart-2" />}
          data={activos}
          columns={columns}
          columnHeaders={columnHeaders}
          columnConfig={{
            nombre: {
              render: (val, item) => (
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color ?? "#64748b" }}
                  />
                  <span>{val}</span>
                </div>
              ),
            },
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
              <TableCell colSpan={2}>TOTAL ACTIVOS</TableCell>
              <TableCell className="text-right text-chart-2">{formatCurrency(totalActivosNum)}</TableCell>
              <TableCell colSpan={3} />
            </TableRow>
          }
        />
        </div>
        </CoachMark>

        <CoachMark
          id="cuentas_conciliaciones"
          text="Usa el ícono ⚖ junto a cada cuenta para conciliarla: compara el saldo real con el del sistema y ajustamos la diferencia. Puedes configurar un recordatorio periódico en Ajustes."
          guideHref="/perfil#recordatorio-conciliacion"
          enabled={isSeen("cuentas_activos")}
        >
          <p className="xs text-muted-foreground flex items-center gap-1.5 px-2">
            <span aria-hidden>⚖</span> Toca el ícono de balanza en una cuenta para conciliarla.
          </p>
        </CoachMark>

        {/* Pasivos / Deudas */}
        <div className="w-full">
          <CoachMark
            id="pasivos"
            text="Tus deudas van aquí: tarjetas, préstamos. Armamos la tabla de cuotas sola y la restamos de tu Balance General."
            guideHref="/help"
            enabled={isSeen("balance_general")}
          >
          <div className="flex items-center justify-between p-2 md:px-4 bg-transparent mb-2">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground">Pasivos</h2>
              <TrendingDown className="w-5 h-5 text-destructive" />
            </div>
            <Button
              className="small bg-brand-1 hover:bg-brand-1/90 text-white gap-2"
              onClick={() => setShowCreateDeuda(true)}
            >
              <Plus className="h-4 w-4" />
              Nueva deuda
            </Button>
          </div>
          </CoachMark>

          {isLoadingDeudas ? (
            <div className="flex justify-center py-10">
              <div className="h-5 w-5 border-2 border-brand-1 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <DeudasTable
              deudas={deudas}
              onVerTabla={(d) => setDetailDeuda(d)}
              onPagarCuota={(d) => d.proxima_cuota && handlePagarCuota(d.proxima_cuota, d)}
              onEdit={(d) => setEditDeuda(d)}
              onDelete={(d) => setDeleteDeuda(d)}
            />
          )}
        </div>
      </div>

      {/* ── Modales cuentas ── */}
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
        onConfirm={handleDeleteCuenta}
        itemName={deleteItem?.nombre}
        isLoading={isDeleting}
      />
      <ReconciliacionModal
        open={!!reconciliarItem}
        onClose={() => setReconciliarItem(null)}
        onSuccess={handleReconciliacionSuccess}
        cuenta={reconciliarItem}
      />

      {/* ── Modales deudas ── */}
      <DeudaForm
        open={showCreateDeuda}
        onClose={() => setShowCreateDeuda(false)}
        onSuccess={handleDeudaSuccess}
      />
      <DeudaForm
        open={!!editDeuda}
        onClose={() => setEditDeuda(null)}
        onSuccess={handleDeudaSuccess}
        editItem={editDeuda}
      />
      {detailDeuda && (
        <DeudaDetailModal
          deuda={detailDeuda}
          onClose={() => setDetailDeuda(null)}
          onPagarCuota={(cuota) => handlePagarCuota(cuota, detailDeuda)}
        />
      )}
      <PagoCuotaModal
        open={!!pagoDeuda}
        onClose={() => setPagoDeuda(null)}
        onSuccess={() => { handleDeudaSuccess(); setPagoDeuda(null); }}
        cuota={pagoDeuda?.cuota ?? null}
        deudaId={pagoDeuda?.deudaId ?? null}
        deudaNombre={pagoDeuda?.deudaNombre ?? null}
      />
      <ConfirmDeleteModal
        open={!!deleteDeuda}
        onClose={() => setDeleteDeuda(null)}
        onConfirm={handleDeleteDeuda}
        itemName={deleteDeuda?.nombre}
        isLoading={isDeletingDeuda}
      />
    </PageShell>
  );
}
