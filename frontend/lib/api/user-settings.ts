import { apiFetch, type ApiResource } from "./client";

export type ReconciliacionTipo = "ninguno" | "semanal" | "quincenal" | "mensual" | "personalizado";

export interface UserSettings {
  id: number;
  user_id: number;
  reconciliacion_tipo: ReconciliacionTipo | null;
  reconciliacion_dia_semana: number | null; // 1=lun … 7=dom
  reconciliacion_dia_mes: number | null;    // 1–28, 0 = último día del mes
  reconciliacion_frecuencia_dias: number | null;
  reconciliacion_proxima: string | null;
  onboarding_seen: Record<string, boolean>;
}

export interface UserSettingsPayload {
  reconciliacion_tipo?: ReconciliacionTipo;
  reconciliacion_dia_semana?: number | null;
  reconciliacion_dia_mes?: number | null;
  reconciliacion_frecuencia_dias?: number | null;
}

export function getUserSettings(token: string) {
  return apiFetch<ApiResource<UserSettings>>("/user-settings", { token });
}

export function updateUserSettings(token: string, body: UserSettingsPayload) {
  return apiFetch<ApiResource<UserSettings>>("/user-settings", {
    method: "PATCH",
    token,
    body,
  });
}

export function markOnboardingSeen(token: string, keys: string[]) {
  return apiFetch<ApiResource<UserSettings>>("/user-settings/onboarding", {
    method: "PATCH",
    token,
    body: { keys },
  });
}

/** Reinicia claves puntuales, o TODO el onboarding si se omite `keys`. */
export function resetOnboarding(token: string, keys?: string[]) {
  return apiFetch<ApiResource<UserSettings>>("/user-settings/onboarding/reset", {
    method: "POST",
    token,
    body: keys ? { keys } : {},
  });
}
