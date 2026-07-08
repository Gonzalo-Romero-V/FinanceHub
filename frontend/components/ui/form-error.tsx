import { cn } from "@/lib/utils";

interface FormErrorProps {
  message: string;
  className?: string;
}

/**
 * Caja de error inline estándar para formularios/modales que permanecen
 * abiertos para que el usuario corrija o reintente (validación de campos o
 * fallo de la última operación). Para acciones de un solo paso sin
 * superficie de reintento visible (eliminar desde una fila, refresco en
 * background, etc.) usar `notifyError` de `@/lib/ui/notify` en su lugar.
 */
export function FormError({ message, className }: FormErrorProps) {
  return (
    <p
      className={cn(
        "small text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2",
        className,
      )}
    >
      {message}
    </p>
  );
}
