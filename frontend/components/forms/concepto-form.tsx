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

interface TipoMovimiento {
  id: number
  nombre: string
}

interface ConceptoFormProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  editItem?: {
    id: number
    nombre: string
    tipo_movimiento: string
  } | null
}

export function ConceptoForm({ open, onClose, onSuccess, editItem }: ConceptoFormProps) {
  const { token } = useAuth()
  const isEdit = !!editItem
  const baseUrl = process.env.NEXT_PUBLIC_API_URL

  const [tipos, setTipos] = useState<TipoMovimiento[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingTypes, setIsFetchingTypes] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nombre, setNombre] = useState("")
  const [tipoId, setTipoId] = useState("")

  useEffect(() => {
    if (!open || !token) return
    setIsFetchingTypes(true)
    fetch(`${baseUrl}/tipos-movimiento`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setTipos(Array.isArray(d.data) ? d.data : []))
      .catch(() => setError("No se pudieron cargar los tipos de movimiento."))
      .finally(() => setIsFetchingTypes(false))
  }, [open, token])

  useEffect(() => {
    if (!open) return
    if (editItem) {
      setNombre(editItem.nombre)
      const t = tipos.find((x) => x.nombre === editItem.tipo_movimiento)
      setTipoId(t ? String(t.id) : "")
    } else {
      setNombre("")
      setTipoId("")
    }
    setError(null)
  }, [open, editItem, tipos])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!nombre.trim()) return setError("El nombre es obligatorio.")
    if (!tipoId) return setError("Selecciona un tipo de movimiento.")

    setIsLoading(true)
    try {
      const url = isEdit
        ? `${baseUrl}/conceptos/${editItem!.id}`
        : `${baseUrl}/conceptos`
      const method = isEdit ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre: nombre.trim(),
          tipo_movimiento_id: Number(tipoId),
        }),
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
      title={isEdit ? "Editar concepto" : "Nuevo concepto"}
      size="sm"
      persistent={isLoading}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Nombre */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="concepto-nombre">Nombre</Label>
          <Input
            id="concepto-nombre"
            placeholder="Ej: Salario, Renta, Supermercado…"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            disabled={isLoading}
          />
        </div>

        {/* Tipo de movimiento */}
        <div className="flex flex-col gap-1.5">
          <Label>Tipo de movimiento</Label>
          {isFetchingTypes ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando tipos...
            </div>
          ) : (
            <Select
              value={tipoId}
              onValueChange={setTipoId}
              disabled={isLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona un tipo" />
              </SelectTrigger>
              <SelectContent>
                {tipos.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <Button variant="outline" type="button" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-brand-1 hover:bg-brand-1/90 text-white min-w-[100px]"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isEdit ? (
              "Guardar"
            ) : (
              "Crear concepto"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
