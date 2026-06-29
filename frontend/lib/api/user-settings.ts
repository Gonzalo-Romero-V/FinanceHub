import { apiFetch, type ApiResource } from "./client";

export interface UserSettings {
  id: number;
  user_id: number;
  reconciliacion_frecuencia_dias: number | null;
  reconciliacion_proxima: string | null;
}

export interface UserSettingsPayload {
  reconciliacion_frecuencia_dias: number | null;
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
