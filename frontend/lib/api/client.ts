import { getBrowserTimezone } from "@/lib/utils/format";

const DEFAULT_API_URL = "http://localhost:8000/api";

export function getApiBaseUrl() {
  return (process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL).replace(/\/$/, "");
}

export interface ApiFetchOptions extends Omit<RequestInit, "headers" | "body"> {
  token?: string | null;
  body?: unknown;
  headers?: Record<string, string>;
}

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  { token, body, headers, ...rest }: ApiFetchOptions = {},
): Promise<T> {
  const url = `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;

  const finalHeaders: Record<string, string> = {
    Accept: "application/json",
    "X-Client-Timezone": getBrowserTimezone(),
    ...headers,
  };

  if (body !== undefined && !(body instanceof FormData)) {
    finalHeaders["Content-Type"] = "application/json";
  }

  if (token) {
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...rest,
    headers: finalHeaders,
    body:
      body === undefined
        ? undefined
        : body instanceof FormData
          ? body
          : JSON.stringify(body),
  });

  const text = await response.text();
  const payload = text ? safeJson(text) : null;

  if (!response.ok) {
    const message = extractErrorMessage(payload) ?? `Error ${response.status}`;
    throw new ApiError(message, response.status, payload);
  }

  return payload as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  if (typeof record.message === "string") return record.message;
  if (typeof record.mensaje === "string") return record.mensaje;
  return null;
}

export interface ApiCollection<T> {
  data: T[];
  message?: string;
  mensaje?: string;
}

export interface ApiResource<T> {
  data: T;
  message?: string;
  mensaje?: string;
}
