"use client"

import { Loader2, Trash2 } from "lucide-react"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { FormError } from "@/components/ui/form-error"

interface ConfirmDeleteModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  itemName?: string
  isLoading?: boolean
  errorMessage?: string
}

export function ConfirmDeleteModal({
  open,
  onClose,
  onConfirm,
  itemName,
  isLoading = false,
  errorMessage,
}: ConfirmDeleteModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Confirmar eliminación" size="sm" persistent={isLoading}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <p className="small text-foreground">
            ¿Estás seguro de que deseas eliminar{" "}
            {itemName ? (
              <span className="font-semibold text-destructive">«{itemName}»</span>
            ) : (
              "este elemento"
            )}
            ?
          </p>
          <p className="xs text-muted-foreground">
            Esta acción no se puede deshacer.
          </p>
        </div>
        {errorMessage && <FormError message={errorMessage} />}

        <div className="flex justify-end gap-3 pt-1">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="min-w-[90px]"
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
            className="min-w-[90px] gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Eliminar
          </Button>
        </div>
      </div>
    </Modal>
  )
}
