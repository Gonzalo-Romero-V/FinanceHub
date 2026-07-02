"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2, TrendingDown } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useAuth } from "@/lib/auth/context";
import {
  createDeuda,
  updateDeuda,
  calcularPreview,
  SISTEMA_LABELS,
  SISTEMA_DESCRIPTIONS,
  type SistemaAmortizacion,
  type Deuda,
  type DeudaPayload,
} from "@/lib/api/deudas";
import { formatCurrency, todayIsoDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

interface DeudaFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editItem?: Deuda | null;
}

const SISTEMAS: SistemaAmortizacion[] = ["frances", "aleman", "bullet"];

function SistemaChip({
  sistema,
  selected,
  onClick,
}: {
  sistema: SistemaAmortizacion;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col gap-1 px-3 py-2.5 rounded-xl border text-left transition-all",
        selected
          ? "border-brand-1 bg-brand-1/10 text-brand-1"
          : "border-border hover:border-muted-foreground/40 text-muted-foreground",
      )}
    >
      <span className="text-sm font-semibold">{SISTEMA_LABELS[sistema]}</span>
      <span className="xs leading-snug">{SISTEMA_DESCRIPTIONS[sistema]}</span>
    </button>
  );
}

function ModoToggle({
  value,
  opcionA,
  opcionB,
  onChange,
  disabled,
}: {
  value: string;
  opcionA: { value: string; label: string };
  opcionB: { value: string; label: string };
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {[opcionA, opcionB].map((op) => (
        <button
          key={op.value}
          type="button"
          onClick={() => onChange(op.value)}
          disabled={disabled}
          className={cn(
            "py-2 rounded-xl border text-sm font-medium transition-all",
            value === op.value
              ? "border-brand-1 bg-brand-1/10 text-brand-1"
              : "border-border hover:border-muted-foreground/40 text-muted-foreground",
          )}
        >
          {op.label}
        </button>
      ))}
    </div>
  );
}

function PreviewRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="xs text-muted-foreground">{label}</span>
      <span className={cn("xs font-semibold tabular-nums", highlight && "text-brand-1")}>{value}</span>
    </div>
  );
}

export function DeudaForm({ open, onClose, onSuccess, editItem }: DeudaFormProps) {
  const { token } = useAuth();
  const isEdit = !!editItem;
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Campos compartidos ────────────────────────────────────────────────────
  const [nombre, setNombre] = useState("");
  const [acreedor, setAcreedor] = useState("");
  const [notas, setNotas] = useState("");
  const [estado, setEstado] = useState<"activa" | "cancelada">("activa");

  // ── Campos de creación ────────────────────────────────────────────────────
  const [sistema, setSistema] = useState<SistemaAmortizacion>("frances");
  const [monto, setMonto] = useState("");
  const [plazo, setPlazo] = useState("");
  const [fechaInicio, setFechaInicio] = useState(todayIsoDate());
  const [tasa, setTasa] = useState("");
  // Modo Francés: "formal" usa tasa, "directo" usa cuota fija
  const [modoFrances, setModoFrances] = useState<"formal" | "directo">("formal");
  const [cuotaDirecta, setCuotaDirecta] = useState("");
  // Modo Bullet: "formal" usa tasa, "informal" usa total pactado
  const [modoBullet, setModoBullet] = useState<"formal" | "informal">("formal");
  const [totalInformal, setTotalInformal] = useState("");

  // ── Reset ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    if (editItem) {
      setNombre(editItem.nombre);
      setAcreedor(editItem.acreedor ?? "");
      setNotas(editItem.notas ?? "");
      setEstado(editItem.estado === "cancelada" ? "cancelada" : "activa");
    } else {
      setNombre("");
      setAcreedor("");
      setNotas("");
      setSistema("frances");
      setMonto("");
      setPlazo("");
      setFechaInicio(todayIsoDate());
      setTasa("");
      setModoFrances("formal");
      setCuotaDirecta("");
      setModoBullet("formal");
      setTotalInformal("");
    }
    setError(null);
  }, [open, editItem]);

  // ── Preview client-side ──────────────────────────────────────────────────
  const preview = useMemo(() => {
    if (isEdit) return null;
    const m = parseFloat(monto);
    const n = parseInt(plazo, 10);
    const t = tasa !== "" ? parseFloat(tasa) : null;
    const cd = cuotaDirecta !== "" ? parseFloat(cuotaDirecta) : null;
    const ti = totalInformal !== "" ? parseFloat(totalInformal) : null;
    return calcularPreview(sistema, m, n, t, cd, ti);
  }, [isEdit, sistema, monto, plazo, tasa, cuotaDirecta, totalInformal, modoFrances, modoBullet]);

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setError(null);
    if (!nombre.trim()) return setError("El nombre es obligatorio.");

    setIsSaving(true);
    try {
      if (!token) throw new Error("Usuario no autenticado.");

      if (isEdit) {
        await updateDeuda(token, editItem!.id, {
          nombre: nombre.trim(),
          acreedor: acreedor.trim() || null,
          notas: notas.trim() || null,
          estado,
        });
        toast.success("Deuda actualizada.");
      } else {
        // Validaciones de creación
        const montoNum = parseFloat(monto);
        const plazoNum = parseInt(plazo, 10);
        if (!monto || isNaN(montoNum) || montoNum <= 0) return setError("El monto debe ser mayor a 0.");
        if (!plazo || isNaN(plazoNum) || plazoNum < 1) return setError("El plazo debe ser de al menos 1 mes.");
        if (!fechaInicio) return setError("La fecha de inicio es obligatoria.");

        const payload: DeudaPayload = {
          nombre: nombre.trim(),
          acreedor: acreedor.trim() || null,
          sistema,
          monto_original: montoNum,
          plazo_meses: plazoNum,
          fecha_inicio: fechaInicio,
          notas: notas.trim() || null,
        };

        if (sistema === "frances") {
          if (modoFrances === "formal") {
            const tasaNum = parseFloat(tasa);
            if (isNaN(tasaNum) || tasaNum < 0) return setError("Ingresá una tasa mensual válida.");
            payload.tasa_mensual = tasaNum;
          } else {
            const cdNum = parseFloat(cuotaDirecta);
            if (isNaN(cdNum) || cdNum <= 0) return setError("Ingresá una cuota directa válida.");
            payload.cuota_directa = cdNum;
          }
        } else if (sistema === "aleman") {
          const tasaNum = parseFloat(tasa);
          if (isNaN(tasaNum) || tasaNum < 0) return setError("Ingresá una tasa mensual válida.");
          payload.tasa_mensual = tasaNum;
        } else if (sistema === "bullet") {
          if (modoBullet === "formal") {
            const tasaNum = parseFloat(tasa);
            if (isNaN(tasaNum) || tasaNum < 0) return setError("Ingresá una tasa mensual válida.");
            payload.tasa_mensual = tasaNum;
          } else {
            const tiNum = parseFloat(totalInformal);
            if (isNaN(tiNum) || tiNum <= 0) return setError("Ingresá el monto total a pagar.");
            payload.total_informal = tiNum;
          }
        }

        await createDeuda(token, payload);
        toast.success("Deuda registrada. La tabla de cuotas está lista.");
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
    } finally {
      setIsSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Editar deuda" : "Registrar deuda"}
      size="lg"
      persistent={isSaving}
    >
      <div className="flex flex-col gap-5">

        {/* ── Campos básicos ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="d-nombre">Nombre <span className="text-destructive">*</span></Label>
            <Input
              id="d-nombre"
              placeholder="Ej: Préstamo automóvil"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              disabled={isSaving}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="d-acreedor">Acreedor <span className="xs text-muted-foreground">(opcional)</span></Label>
            <Input
              id="d-acreedor"
              placeholder="Ej: Banco Nacional, Juan Pérez"
              value={acreedor}
              onChange={(e) => setAcreedor(e.target.value)}
              disabled={isSaving}
            />
          </div>
        </div>

        {/* ── Modo edición: solo campos editables ─────────────────────── */}
        {isEdit ? (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="d-notas">Notas</Label>
              <textarea
                id="d-notas"
                className="flex min-h-[70px] w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 resize-none"
                placeholder="Observaciones adicionales..."
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                disabled={isSaving}
              />
            </div>

            {/* Estado (solo activa ↔ cancelada; pagada lo pone el sistema automáticamente) */}
            <div className="flex items-center justify-between py-2 px-3 rounded-xl border border-border bg-muted/20">
              <div>
                <p className="text-sm font-medium">Estado</p>
                <p className="xs text-muted-foreground">El estado «Pagada» se aplica automáticamente al registrar la última cuota.</p>
              </div>
              <button
                type="button"
                onClick={() => setEstado((v) => v === "activa" ? "cancelada" : "activa")}
                disabled={isSaving || editItem?.estado === "pagada"}
                className={cn(
                  "relative w-11 h-6 rounded-full transition-colors duration-200",
                  estado === "activa" ? "bg-brand-1" : "bg-muted",
                )}
              >
                <span className={cn(
                  "absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200",
                  estado === "activa" && "translate-x-5",
                )} />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-muted/30 border border-border">
              <p className="xs text-muted-foreground">
                Los datos financieros (sistema, capital, tasa, plazo) son inmutables tras crear la deuda.
              </p>
            </div>
          </>
        ) : (
          <>
            {/* ── Sistema de amortización ────────────────────────────── */}
            <div className="flex flex-col gap-2">
              <Label>Sistema de amortización <span className="text-destructive">*</span></Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {SISTEMAS.map((s) => (
                  <SistemaChip
                    key={s}
                    sistema={s}
                    selected={sistema === s}
                    onClick={() => setSistema(s)}
                  />
                ))}
              </div>
            </div>

            {/* ── Monto y fecha de inicio ────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="d-monto">Capital prestado <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">$</span>
                  <Input
                    id="d-monto"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    className="pl-7"
                    disabled={isSaving}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="d-fecha">Fecha de inicio <span className="text-destructive">*</span></Label>
                <Input
                  id="d-fecha"
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  disabled={isSaving}
                />
              </div>
            </div>

            {/* ── Condiciones financieras (varían por sistema) ────────── */}
            {sistema === "frances" && (
              <div className="flex flex-col gap-3 p-4 rounded-xl border border-border bg-muted/10">
                <Label className="text-muted-foreground uppercase xs tracking-wide font-bold">Condiciones — Sistema Francés</Label>

                <ModoToggle
                  value={modoFrances}
                  opcionA={{ value: "formal", label: "Con tasa de interés" }}
                  opcionB={{ value: "directo", label: "Cuota pactada directamente" }}
                  onChange={(v) => setModoFrances(v as "formal" | "directo")}
                  disabled={isSaving}
                />

                <div className="grid grid-cols-2 gap-3">
                  {modoFrances === "formal" ? (
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="d-tasa">Tasa mensual (%) <span className="text-destructive">*</span></Label>
                      <div className="relative">
                        <Input
                          id="d-tasa"
                          type="number"
                          min="0"
                          step="0.001"
                          placeholder="Ej: 1.5"
                          value={tasa}
                          onChange={(e) => setTasa(e.target.value)}
                          className="pr-7"
                          disabled={isSaving}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 xs text-muted-foreground">%</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="d-cuota">Cuota mensual <span className="text-destructive">*</span></Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">$</span>
                        <Input
                          id="d-cuota"
                          type="number"
                          min="0.01"
                          step="0.01"
                          placeholder="0.00"
                          value={cuotaDirecta}
                          onChange={(e) => setCuotaDirecta(e.target.value)}
                          className="pl-7"
                          disabled={isSaving}
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="d-plazo">Plazo (meses) <span className="text-destructive">*</span></Label>
                    <Input
                      id="d-plazo"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Ej: 24"
                      value={plazo}
                      onChange={(e) => setPlazo(e.target.value)}
                      disabled={isSaving}
                    />
                  </div>
                </div>
              </div>
            )}

            {sistema === "aleman" && (
              <div className="flex flex-col gap-3 p-4 rounded-xl border border-border bg-muted/10">
                <Label className="text-muted-foreground uppercase xs tracking-wide font-bold">Condiciones — Sistema Alemán</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="d-tasa-al">Tasa mensual (%) <span className="text-destructive">*</span></Label>
                    <div className="relative">
                      <Input
                        id="d-tasa-al"
                        type="number"
                        min="0"
                        step="0.001"
                        placeholder="Ej: 1.5"
                        value={tasa}
                        onChange={(e) => setTasa(e.target.value)}
                        className="pr-7"
                        disabled={isSaving}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 xs text-muted-foreground">%</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="d-plazo-al">Plazo (meses) <span className="text-destructive">*</span></Label>
                    <Input
                      id="d-plazo-al"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Ej: 24"
                      value={plazo}
                      onChange={(e) => setPlazo(e.target.value)}
                      disabled={isSaving}
                    />
                  </div>
                </div>
              </div>
            )}

            {sistema === "bullet" && (
              <div className="flex flex-col gap-3 p-4 rounded-xl border border-border bg-muted/10">
                <Label className="text-muted-foreground uppercase xs tracking-wide font-bold">Condiciones — Pago Único</Label>

                <ModoToggle
                  value={modoBullet}
                  opcionA={{ value: "formal", label: "Con tasa de interés" }}
                  opcionB={{ value: "informal", label: "Total pactado directamente" }}
                  onChange={(v) => setModoBullet(v as "formal" | "informal")}
                  disabled={isSaving}
                />

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="d-plazo-b">Plazo hasta el vencimiento (meses) <span className="text-destructive">*</span></Label>
                    <Input
                      id="d-plazo-b"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Ej: 4"
                      value={plazo}
                      onChange={(e) => setPlazo(e.target.value)}
                      disabled={isSaving}
                    />
                  </div>
                  {modoBullet === "formal" ? (
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="d-tasa-b">Tasa mensual (%) <span className="text-destructive">*</span></Label>
                      <div className="relative">
                        <Input
                          id="d-tasa-b"
                          type="number"
                          min="0"
                          step="0.001"
                          placeholder="Ej: 5"
                          value={tasa}
                          onChange={(e) => setTasa(e.target.value)}
                          className="pr-7"
                          disabled={isSaving}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 xs text-muted-foreground">%</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="d-ti">Total a pagar al vencimiento <span className="text-destructive">*</span></Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">$</span>
                        <Input
                          id="d-ti"
                          type="number"
                          min="0.01"
                          step="0.01"
                          placeholder="Ej: 120.00"
                          value={totalInformal}
                          onChange={(e) => setTotalInformal(e.target.value)}
                          className="pl-7"
                          disabled={isSaving}
                        />
                      </div>
                      <p className="xs text-muted-foreground">Ej: «me prestaron $100, pago $120 en 4 meses»</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Notas ─────────────────────────────────────────────── */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="d-notas-c">Notas <span className="xs text-muted-foreground">(opcional)</span></Label>
              <textarea
                id="d-notas-c"
                className="flex min-h-[60px] w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 resize-none"
                placeholder="Condiciones especiales, contexto, etc."
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                disabled={isSaving}
              />
            </div>

            {/* ── Vista previa ───────────────────────────────────────── */}
            {preview && (
              <div className="flex flex-col gap-2 p-4 rounded-xl bg-muted/30 border border-border">
                <p className="xs font-bold text-muted-foreground uppercase tracking-wide">Vista previa del préstamo</p>
                {preview.cuotaFija !== undefined && (
                  <PreviewRow label="Cuota mensual" value={formatCurrency(preview.cuotaFija)} highlight />
                )}
                {preview.primeraCuota !== undefined && (
                  <PreviewRow label="Primera cuota" value={formatCurrency(preview.primeraCuota)} highlight />
                )}
                {preview.ultimaCuota !== undefined && (
                  <PreviewRow label="Última cuota" value={formatCurrency(preview.ultimaCuota)} />
                )}
                <PreviewRow label="Total a pagar" value={formatCurrency(preview.totalAPagar)} />
                <PreviewRow
                  label="Costo financiero"
                  value={
                    preview.interesTotal >= 0
                      ? `${formatCurrency(preview.interesTotal)} (${parseFloat(monto) > 0 ? ((preview.interesTotal / parseFloat(monto)) * 100).toFixed(1) : "0"}%)`
                      : "—"
                  }
                />
                {preview.tasaImplicita !== undefined && (
                  <PreviewRow
                    label="Tasa mensual implícita"
                    value={`${preview.tasaImplicita.toFixed(3)}%`}
                  />
                )}
              </div>
            )}
          </>
        )}

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSaving}
            className="gap-2 bg-brand-1 hover:bg-brand-1/90 text-white"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            {isEdit ? "Guardar cambios" : "Registrar deuda"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
