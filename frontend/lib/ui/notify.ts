import { toast, type ExternalToast } from "sonner";

/**
 * Wrapper delgado sobre `sonner` para que toda la app use la misma duración
 * por severidad en vez de que cada componente decida la suya. Los errores
 * quedan más tiempo en pantalla (son lo más importante de leer); éxito/info
 * usan la duración default del `<Toaster>` global (4500ms) salvo que se
 * pase `duration` explícito en `options`.
 *
 * Reservado para acciones de un solo paso sin superficie de reintento
 * visible (eliminar desde una fila, refresco en background, consultas al
 * LLM). Para formularios/modales que permanecen abiertos para corregir o
 * reintentar, usar `<FormError>` (`@/components/ui/form-error`) en su lugar.
 */

export function notifyError(message: string, options?: ExternalToast) {
  return toast.error(message, { duration: 6000, ...options });
}

export function notifySuccess(message: string, options?: ExternalToast) {
  return toast.success(message, options);
}

export function notifyWarning(message: string, options?: ExternalToast) {
  return toast.warning(message, { duration: 5000, ...options });
}

export function notifyInfo(message: string, options?: ExternalToast) {
  return toast.info(message, { duration: 4500, ...options });
}
