import { apiFetch } from "./client";

export interface AppNotification {
  id: string;
  type: string;
  data: {
    titulo?: string;
    mensaje?: string;
    [key: string]: unknown;
  };
  read_at: string | null;
  created_at: string;
}

export interface NotificationsResponse {
  mensaje: string;
  data: AppNotification[];
  unread_count: number;
}

export function listNotifications(token: string) {
  return apiFetch<NotificationsResponse>("/notifications", { token });
}

export function markNotificationRead(token: string, id: string) {
  return apiFetch<{ mensaje: string }>(`/notifications/${id}/leida`, {
    method: "PATCH",
    token,
  });
}

export function markAllNotificationsRead(token: string) {
  return apiFetch<{ mensaje: string }>("/notifications/leer-todas", {
    method: "PATCH",
    token,
  });
}

export interface PushSubscriptionPayload {
  tipo: "web" | "fcm";
  identificador: string;
  payload: Record<string, unknown>;
}

export function registerPushSubscription(token: string, body: PushSubscriptionPayload) {
  return apiFetch<{ mensaje: string }>("/push-subscriptions", {
    method: "POST",
    token,
    body,
  });
}

export function unregisterPushSubscription(token: string, identificador: string) {
  return apiFetch<{ mensaje: string }>("/push-subscriptions", {
    method: "DELETE",
    token,
    body: { identificador },
  });
}
