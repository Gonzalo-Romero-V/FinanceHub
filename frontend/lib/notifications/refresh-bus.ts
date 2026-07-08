/**
 * Web no tiene push real hacia la propia pestaña abierta — lo más cercano
 * sin meter infraestructura de websockets/SSE es: la campanita poll-ea cada
 * tanto (fallback general), y además cualquier acción que YA sabemos que
 * generó una notificación (ej. cruzar un umbral de presupuesto al guardar
 * un movimiento) puede avisarle a la campanita que se refresque ya mismo,
 * en vez de esperar al próximo poll.
 */
const REFRESH_EVENT = "financehub:notifications-refresh";

export function triggerNotificationsRefresh() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(REFRESH_EVENT));
}

export function onNotificationsRefresh(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(REFRESH_EVENT, callback);
  return () => window.removeEventListener(REFRESH_EVENT, callback);
}
