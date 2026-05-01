"use client"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/app/context/AuthContext"

interface TipoCuenta {
  id: number
  nombre: string
}

interface CuentaFormData {
  nombre: string
  tipo_cuenta_id: string
  saldo: string
  activa: boolean
}

interface CuentaFormProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  /** Si se pasa, el formulario estará en modo edición */
  editItem?: {
    id: number
    nombre: string
    tipo_cuenta: string
    saldo: number
    activa: string
  } | null
}

export function CuentaForm({ open, onClose, onSuccess, editItem }: CuentaFormProps) {
  const { token } = useAuth()
  const isEdit = !!editItem
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL

  const [tiposCuenta, setTiposCuenta] = useState<TipoCuenta[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingTypes, setIsFetchingTypes] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState<CuentaFormData>({
    nombre: "",
    tipo_cuenta_id: "",
    saldo: "0",
    activa: true,
  })

  // Cargar tipos de cuenta al abrir
  useEffect(() => {
    if (!open || !token) return
    setIsFetchingTypes(true)
    fetch(`${baseUrl}/tipos-cuenta`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setTiposCuenta(Array.isArray(d.data) ? d.data : []))
      .catch(() => setError("No se pudieron cargar los tipos de cuenta."))
      .finally(() => setIsFetchingTypes(false))
  }, [open, token])

  // Inicializar formulario al abrir (modo edición o limpio)
  useEffect(() => {
    if (!open) return
    if (editItem) {
      // Buscamos el id del tipo por nombre
      const tipoId = tiposCuenta.find((t) => t.nombre === editItem.tipo_cuenta)?.id
      setForm({
        nombre: editItem.nombre,
        tipo_cuenta_id: tipoId ? String(tipoId) : "",
        saldo: String(editItem.saldo),
        activa: editItem.activa === "Activa",
      })
    } else {
      setForm({ nombre: "", tipo_cuenta_id: "", saldo: "0", activa: true })
    }
    setError(null)
  }, [open, editItem, tiposCuenta])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!form.nombre.trim()) return setError("El nombre es obligatorio.")
    if (!form.tipo_cuenta_id) return setError("Selecciona un tipo de cuenta.")
    if (!isEdit && (isNaN(Number(form.saldo)) || Number(form.saldo) < 0))
      return setError("El saldo inicial debe ser un número mayor o igual a 0.")

    setIsLoading(true)
    try {
      const url = isEdit
        ? `${baseUrl}/cuentas/${editItem!.id}`
        : `${baseUrl}/cuentas`
      const method = isEdit ? "PATCH" : "POST"

      const body: Record<string, any> = {
        nombre: form.nombre.trim(),
        tipo_cuenta_id: Number(form.tipo_cuenta_id),
        activa: form.activa,
      }
      if (!isEdit) {
        body.saldo = Number(form.saldo)
      }

      const res = await fetch(url, {
        method,
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
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Editar cuenta" : "Nueva cuenta"}
      size="sm"
      persistent={isLoading}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Nombre */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cuenta-nombre">Nombre</Label>
          <Input
            id="cuenta-nombre"
            placeholder="Ej: Cuenta de ahorros"
            value={form.nombre}
            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
            disabled={isLoading}
          />
        </div>

        {/* Tipo */}
        <div className="flex flex-col gap-1.5">
          <Label>Tipo de cuenta</Label>
          {isFetchingTypes ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando tipos...
            </div>
          ) : (
            <Select
              value={form.tipo_cuenta_id}
              onValueChange={(v) => setForm((f) => ({ ...f, tipo_cuenta_id: v }))}
              disabled={isLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona un tipo" />
              </SelectTrigger>
              <SelectContent>
                {tiposCuenta.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Saldo inicial — solo en creación */}
        {!isEdit && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cuenta-saldo">Saldo inicial</Label>
            <Input
              id="cuenta-saldo"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.saldo}
              onChange={(e) => setForm((f) => ({ ...f, saldo: e.target.value }))}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              El saldo no podrá modificarse manualmente después; solo cambiará mediante movimientos.
            </p>
          </div>
        )}

        {/* Estado activa */}
        <div className="flex items-center gap-3">
          <input
            id="cuenta-activa"
            type="checkbox"
            checked={form.activa}
            onChange={(e) => setForm((f) => ({ ...f, activa: e.target.checked }))}
            disabled={isLoading}
            className="h-4 w-4 accent-brand-1 cursor-pointer"
          />
          <Label htmlFor="cuenta-activa" className="cursor-pointer font-normal">
            Cuenta activa
          </Label>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {/* Acciones */}
        <div className="flex justify-end gap-3 pt-1">
          <Button variant="outline" type="button" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-brand-1 hover:bg-brand-1/90 text-white min-w-[100px]"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? "Guardar" : "Crear cuenta"}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
