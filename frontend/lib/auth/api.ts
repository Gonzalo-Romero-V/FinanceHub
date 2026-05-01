import type { AuthUser, LoginCredentials, RegisterCredentials } from "./types";

const DEFAULT_API_URL = "http://localhost:8000/api";

function getApiBaseUrl() {
  return (process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL).replace(/\/$/, "");
}

async function parseResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.mensaje || data?.message || "Error en la autenticación");
  }

  return data as T;
}

export async function loginRequest(credentials: LoginCredentials) {
  const response = await fetch(`${getApiBaseUrl()}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(credentials),
  });

  return parseResponse<{ mensaje: string; data: AuthUser; token: string }>(response);
}

export async function registerRequest(credentials: RegisterCredentials) {
  const response = await fetch(`${getApiBaseUrl()}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(credentials),
  });

  return parseResponse<{ mensaje: string; data: AuthUser; token?: string }>(response);
}

export async function fetchCurrentUser(token: string) {
  const response = await fetch(`${getApiBaseUrl()}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  const data = await parseResponse<{ mensaje: string; data: AuthUser }>(response);
  return data.data;
}

export async function logoutRequest(token: string) {
  const response = await fetch(`${getApiBaseUrl()}/auth/logout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("No se pudo cerrar la sesión");
  }

  return true;
}
