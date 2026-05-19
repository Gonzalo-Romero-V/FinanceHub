import { apiFetch, type ApiResource } from "@/lib/api/client";
import type { AuthUser, LoginCredentials, RegisterCredentials } from "./types";

export function loginRequest(credentials: LoginCredentials) {
  return apiFetch<{ mensaje: string; data: AuthUser; token: string }>("/auth/login", {
    method: "POST",
    body: credentials,
  });
}

export function registerRequest(credentials: RegisterCredentials) {
  return apiFetch<{ mensaje: string; data: AuthUser; token?: string }>("/auth/register", {
    method: "POST",
    body: credentials,
  });
}

export async function fetchCurrentUser(token: string) {
  const data = await apiFetch<ApiResource<AuthUser>>("/auth/me", { token });
  return data.data;
}

export async function logoutRequest(token: string) {
  await apiFetch<void>("/auth/logout", {
    method: "POST",
    token,
  });
  return true;
}
