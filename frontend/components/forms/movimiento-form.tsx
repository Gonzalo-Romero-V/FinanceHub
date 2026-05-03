"use client"

import { useState, useEffect, useCallback } from "react"
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  ChevronLeft,
  Check,
  Loader2,
  Link,
} from "lucide-react"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/app/context/AuthContext"
import { cn } from "@/lib/utils"

// ─── Types ──────────────────────────────────────────────────────────────────

type TipoMovimiento = "Ingreso" | "Egreso" | "Transferencia"

interface Concepto {
  id: number
  nombre: string
  tipo_movimiento?: { nombre: string }
}

interface Cuenta {
  id: number
  nombre: string
  saldo: number
}

interface MovimientoFormState {
  tipo: TipoMovimiento | null
  concepto_id: number | null
  concepto_nombre: string
  cuenta_origen_id: number | null
  cuenta_origen_nombre: string
  cuenta_destino_id: number | null
  cuenta_destino_nombre: string
  monto: string
  nota: string
  fecha: string
}

const getTodayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const EMPTY_STATE: MovimientoFormState = {
  tipo: null,
  concepto_id: null,
  concepto_nombre: "",
  cuenta_origen_id: null,
  cuenta_origen_nombre: "",
  cuenta_destino_id: null,
  cuenta_destino_nombre: "",
  monto: "",
  nota: "",
  fecha: getTodayStr(),
}

// Pasos: 1 tipo, 2 concepto, 3 cuentas, 4 detalles, 5 resumen
const STEP_LABELS = ["Tipo", "Concepto", "Cuenta", "Detalles", "Resumen"]

interface MovimientoFormProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

// ─── Subcomponents ──────────────────────────────────────────────────────────

function StepBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1 mb-6">
      {Array.from({ length: total }).map((_, i) => {
        const step = i + 1
        const done = step < current
        const active = step === current
        return (
          <div key={step} className="flex items-center gap-1 flex-1">
            <div
              className={cn(
                "h-1.5 flex-1 rounded-full transition-all duration-300",
                done || active ? "bg-brand-1" : "bg-muted"
              )}
            />
            {i === total - 1 && (
              <div
                className={cn(
                  "flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold transition-all duration-300",
                  done ? "bg-brand-1 text-white" : active ? "bg-brand-1/20 text-brand-1 border border-brand-1" : "bg-muted text-muted-foreground"
                )}
              >
                {done ? <Check className="h-3 w-3" /> : total}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function TipoButton({
  tipo,
  label,
  description,
  icon: Icon,
  colorClass,
  bgClass,
  selected,
  onClick,
}: {
  tipo: TipoMovimiento
  label: string
  description: string
  icon: React.ElementType
  colorClass: string
  bgClass: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all duration-200 cursor-pointer",
        selected
          ? `border-current ${colorClass} ${bgClass}`
          : "border-border hover:border-muted-foreground/40 text-foreground"
      )}
    >
      <div className={cn("p-3 rounded-full", selected ? bgClass : "bg-muted/50")}>
        <Icon className={cn("h-6 w-6", colorClass)} />
      </div>
      <span className="font-bold text-sm">{label}</span>
      <span className="text-xs text-muted-foreground text-center leading-tight">{description}</span>
    </button>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function MovimientoForm({ open, onClose, onSuccess }: MovimientoFormProps) {
  const { token } = useAuth()
  const baseUrl = process.env.NEXT_PUBLIC_API_URL

  const [step, setStep] = useState(1)
  const [form, setForm] = useState<MovimientoFormState>(EMPTY_STATE)
  const [conceptos, setConceptos] = useState<Concepto[]>([])
  const [cuentas, setCuentas] = useState<Cuenta[]>([])
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = useCallback(() => {
    setStep(1)
    setForm(EMPTY_STATE)
    setError(null)
  }, [])

  // Al abrir, limpiar
  useEffect(() => {
    if (open) reset()
  }, [open, reset])

  // Cargar conceptos y cuentas al abrir
  useEffect(() => {
    if (!open || !token) return
    setIsLoadingData(true)
    Promise.all([
      fetch(`${baseUrl}/conceptos`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch(`${baseUrl}/cuentas`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    ])
      .then(([cData, cuData]) => {
        setConceptos(Array.isArray(cData.data) ? cData.data : [])
        setCuentas(Array.isArray(cuData.data) ? cuData.data : [])
      })
      .catch(() => setError("Error al cargar datos. Intenta de nuevo."))
      .finally(() => setIsLoadingData(false))
  }, [open, token])

  const conceptosFiltrados = conceptos.filter(
    (c) => c.tipo_movimiento?.nombre === form.tipo
  )

  const handleSelectTipo = (tipo: TipoMovimiento) => {
    setForm((f) => ({
      ...f,
      tipo,
      concepto_id: null,
      concepto_nombre: "",
      cuenta_origen_id: null,
      cuenta_origen_nombre: "",
      cuenta_destino_id: null,
      cuenta_destino_nombre: "",
    }))
    setStep(2)
  }

  const handleSelectConcepto = (c: Concepto) => {
    setForm((f) => ({ ...f, concepto_id: c.id, concepto_nombre: c.nombre }))
    setStep(3)
  }

  const handleSelectCuenta = (cuenta: Cuenta, role: "origen" | "destino") => {
    setForm((f) => ({
      ...f,
      ...(role === "origen"
        ? { cuenta_origen_id: cuenta.id, cuenta_origen_nombre: cuenta.nombre }
        : { cuenta_destino_id: cuenta.id, cuenta_destino_nombre: cuenta.nombre }),
    }))

    // Avance automático según el tipo
    if (form.tipo === "Egreso" && role === "origen") setStep(4)
    else if (form.tipo === "Ingreso" && role === "destino") setStep(4)
    else if (form.tipo === "Transferencia") {
      // Para transferencia: primero origen luego destino
      if (role === "origen") {
        // Permanecer en paso 3 para elegir destino — se maneja con sub-selección
      } else {
        setStep(4)
      }
    }
  }

  const handleSubmit = async () => {
    setError(null)
    if (!form.monto || isNaN(Number(form.monto)) || Number(form.monto) <= 0) {
      return setError("El monto debe ser un número mayor a 0.")
    }

    setIsSubmitting(true)
    try {
      const body: Record<string, any> = {
        monto: Number(form.monto),
        concepto_id: form.concepto_id,
        cuenta_origen_id: form.cuenta_origen_id,
        cuenta_destino_id: form.cuenta_destino_id,
        nota: form.nota.trim() || null,
        fecha: form.fecha || getTodayStr(),
      }

      const res = await fetch(`${baseUrl}/movimientos`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.message || `Error ${res.status}`)
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || "Ocurrió un error inesperado.")
      setStep(5) // Permanecer en el resumen mostrando el error
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── Step renderers ────────────────────────────────────────────────────────

  const renderStep1 = () => (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground mb-2">
        ¿Qué tipo de movimiento quieres registrar?
      </p>
      <div className="grid grid-cols-3 gap-3">
        <TipoButton
          tipo="Ingreso"
          label="Ingreso"
          description="Dinero que entra"
          icon={ArrowDownLeft}
          colorClass="text-chart-2"
          bgClass="bg-chart-2/10"
          selected={form.tipo === "Ingreso"}
          onClick={() => handleSelectTipo("Ingreso")}
        />
        <TipoButton
          tipo="Egreso"
          label="Egreso"
          description="Dinero que sale"
          icon={ArrowUpRight}
          colorClass="text-destructive"
          bgClass="bg-destructive/10"
          selected={form.tipo === "Egreso"}
          onClick={() => handleSelectTipo("Egreso")}
        />
        <TipoButton
          tipo="Transferencia"
          label="Transferencia"
          description="Entre cuentas"
          icon={ArrowRightLeft}
          colorClass="text-brand-1"
          bgClass="bg-brand-1/10"
          selected={form.tipo === "Transferencia"}
          onClick={() => handleSelectTipo("Transferencia")}
        />
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground mb-1">
        Selecciona el concepto para este{" "}
        <span className="font-semibold text-foreground">{form.tipo}</span>:
      </p>
      {isLoadingData ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-brand-1" />
        </div>
      ) : conceptosFiltrados.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-sm">
          No tienes conceptos de tipo {form.tipo}.{" "}
          <span className="text-brand-1 font-medium">Crea uno desde la sección</span> <Link href="/conceptos">Conceptos.</Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
          {conceptosFiltrados.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleSelectConcepto(c)}
              className={cn(
                "text-left px-4 py-3 rounded-xl border transition-all duration-150 text-sm font-medium",
                form.concepto_id === c.id
                  ? "border-brand-1 bg-brand-1/10 text-brand-1"
                  : "border-border hover:border-muted-foreground/50 hover:bg-muted/30"
              )}
            >
              {c.nombre}
            </button>
          ))}
        </div>
      )}
    </div>
  )

  const CuentaButton = ({ cuenta, role, selected }: { cuenta: Cuenta; role: "origen" | "destino"; selected: boolean }) => (
    <button
      key={cuenta.id}
      type="button"
      onClick={() => handleSelectCuenta(cuenta, role)}
      className={cn(
        "text-left px-4 py-3 rounded-xl border transition-all duration-150",
        selected
          ? "border-brand-1 bg-brand-1/10"
          : "border-border hover:border-muted-foreground/50 hover:bg-muted/30"
      )}
    >
      <p className="text-sm font-medium text-foreground">{cuenta.nombre}</p>
      <p className="text-xs text-muted-foreground">
        Saldo: {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cuenta.saldo)}
      </p>
    </button>
  )

  const renderStep3 = () => {
    if (form.tipo === "Transferencia") {
      // Dos columnas: origen y destino
      return (
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Cuenta origen (de dónde sale)
            </p>
            <div className="flex flex-col gap-2 max-h-44 overflow-y-auto pr-1">
              {cuentas.map((c) => (
                <CuentaButton
                  key={c.id}
                  cuenta={c}
                  role="origen"
                  selected={form.cuenta_origen_id === c.id}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Cuenta destino (a dónde llega)
            </p>
            <div className="flex flex-col gap-2 max-h-44 overflow-y-auto pr-1">
              {cuentas
                .filter((c) => c.id !== form.cuenta_origen_id)
                .map((c) => (
                  <CuentaButton
                    key={c.id}
                    cuenta={c}
                    role="destino"
                    selected={form.cuenta_destino_id === c.id}
                  />
                ))}
            </div>
          </div>
          {form.cuenta_origen_id && form.cuenta_destino_id && (
            <Button
              type="button"
              onClick={() => setStep(4)}
              className="w-full bg-brand-1 hover:bg-brand-1/90 text-white"
            >
              Continuar
            </Button>
          )}
        </div>
      )
    }

    const role = form.tipo === "Egreso" ? "origen" : "destino"
    const label =
      form.tipo === "Egreso"
        ? "¿Desde qué cuenta sale el dinero?"
        : "¿A qué cuenta entra el dinero?"

    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground mb-1">{label}</p>
        {isLoadingData ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-brand-1" />
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
            {cuentas.map((c) => (
              <CuentaButton
                key={c.id}
                cuenta={c}
                role={role}
                selected={
                  role === "origen"
                    ? form.cuenta_origen_id === c.id
                    : form.cuenta_destino_id === c.id
                }
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderStep4 = () => (
    <div className="flex flex-col gap-4">
      {/* Monto */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="mov-monto" className="font-semibold">
          Monto <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">$</span>
          <Input
            id="mov-monto"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0.00"
            value={form.monto}
            onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))}
            className="pl-7"
          />
        </div>
      </div>

      {/* Fecha */}
{/*       <div className="flex flex-col gap-1.5">
        <Label htmlFor="mov-fecha">Fecha</Label>
        <Input
          id="mov-fecha"
          type="date"
          value={form.fecha}
          max={getTodayStr()}
          onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
        />
      </div> */}

      {/* Nota */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="mov-nota">Nota (opcional)</Label>
        <Input
          id="mov-nota"
          placeholder="Ej: Pago de factura de luz"
          value={form.nota}
          onChange={(e) => setForm((f) => ({ ...f, nota: e.target.value }))}
        />
      </div>

      <Button
        type="button"
        onClick={() => {
          if (!form.monto || Number(form.monto) <= 0) {
            setError("El monto debe ser mayor a 0.")
            return
          }
          setError(null)
          setStep(5)
        }}
        className="w-full bg-brand-1 hover:bg-brand-1/90 text-white mt-2"
      >
        Ver resumen
      </Button>
    </div>
  )

  const SummaryRow = ({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) => (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold min-w-20">{label}</span>
      <span className={cn("text-sm font-semibold text-right", valueClass)}>{value}</span>
    </div>
  )

  const tipoColors: Record<TipoMovimiento, string> = {
    Ingreso: "text-chart-2",
    Egreso: "text-destructive",
    Transferencia: "text-brand-1",
  }

  const renderStep5 = () => (
    <div className="flex flex-col gap-5">
      <div className="bg-muted/20 rounded-xl p-4 flex flex-col gap-0.5 border border-border/60">
        <SummaryRow label="Tipo" value={form.tipo!} valueClass={tipoColors[form.tipo!]} />
        <SummaryRow label="Concepto" value={form.concepto_nombre} />
        {form.cuenta_origen_nombre && (
          <SummaryRow label="Origen" value={form.cuenta_origen_nombre} />
        )}
        {form.cuenta_destino_nombre && (
          <SummaryRow label="Destino" value={form.cuenta_destino_nombre} />
        )}
        <SummaryRow
          label="Monto"
          value={new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(form.monto))}
          valueClass="text-lg font-black text-foreground"
        />
        <SummaryRow label="Fecha" value={form.fecha} />
        {form.nota && <SummaryRow label="Nota" value={form.nota} />}
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => { setError(null); setStep(4) }}
          disabled={isSubmitting}
          className="flex-1"
        >
          Volver
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex-1 bg-brand-1 hover:bg-brand-1/90 text-white font-bold"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Check className="h-4 w-4" /> Confirmar
            </>
          )}
        </Button>
      </div>
    </div>
  )

  const stepTitles: Record<number, string> = {
    1: "Registrar movimiento",
    2: `Elegir concepto`,
    3: `Elegir cuenta${form.tipo === "Transferencia" ? "s" : ""}`,
    4: "Detalles del movimiento",
    5: "Confirmar movimiento",
  }

  const canGoBack = step > 1 && !isSubmitting

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={stepTitles[step]}
      size="md"
      persistent={isSubmitting}
    >
      <div className="flex flex-col gap-0">
        <StepBar current={step} total={5} />

        {/* Back button */}
        {canGoBack && (
          <button
            type="button"
            onClick={() => { setError(null); setStep((s) => s - 1) }}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors w-fit"
          >
            <ChevronLeft className="h-4 w-4" />
            Volver
          </button>
        )}

        {/* Step content */}
        <div className="animate-in fade-in-0 slide-in-from-right-4 duration-200">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
          {step === 5 && renderStep5()}
        </div>

        {/* Inline error (pasos intermedios) */}
        {error && step !== 5 && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 mt-3">
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}
