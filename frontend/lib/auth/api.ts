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

export function forgotPasswordRequest(email: string) {
  return apiFetch<{ mensaje: string }>("/auth/forgot-password", {
    method: "POST",
    body: { email },
  });
}

export function resetPasswordRequest(payload: {
  token: string;
  email: string;
  password: string;
  password_confirmation: string;
}) {
  return apiFetch<{ mensaje: string }>("/auth/reset-password", {
    method: "POST",
    body: payload,
  });
}

export function resendVerificationRequest(email: string) {
  return apiFetch<{ mensaje: string }>("/auth/resend-verification", {
    method: "POST",
    body: { email },
  });
}
