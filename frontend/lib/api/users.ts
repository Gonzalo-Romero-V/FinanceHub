import { apiFetch, type ApiResource } from "./client";
import type { AuthUser } from "@/lib/auth/types";

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  password?: string;
}

export function getUser(token: string, id: number) {
  return apiFetch<ApiResource<AuthUser>>(`/users/${id}`, { token });
}

export function updateUser(token: string, id: number, body: UpdateUserPayload) {
  return apiFetch<ApiResource<AuthUser>>(`/users/${id}`, {
    method: "PATCH",
    token,
    body,
  });
}
