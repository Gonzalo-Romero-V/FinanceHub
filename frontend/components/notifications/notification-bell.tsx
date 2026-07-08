"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/lib/auth/context";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from "@/lib/api/notifications";

/**
 * Ícono de bandeja en el header — componente 100% compartido entre web y
 * mobile (no depende de nada de Capacitor). Es la fuente de verdad
 * persistente de las notificaciones del usuario; el push (web/nativo) es
 * solo un aviso en tiempo real por encima de esto.
 */
export function NotificationBell() {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const res = await listNotifications(token);
      setItems(res.data);
      setUnreadCount(res.unread_count);
    } catch {
      // Silencioso: la campanita no debe romper la navegación si falla.
    }
  }, [token]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60_000);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleOpenChange = async (next: boolean) => {
    setOpen(next);
    if (next) await refresh();
  };

  const handleMarkRead = async (id: string) => {
    if (!token) return;
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await markNotificationRead(token, id);
    } catch {
      refresh();
    }
  };

  const handleMarkAllRead = async () => {
    if (!token || unreadCount === 0) return;
    setLoading(true);
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    setUnreadCount(0);
    try {
      await markAllNotificationsRead(token);
    } catch {
      refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full text-muted-foreground hover:text-brand-1"
          aria-label="Notificaciones"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 xs font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="small font-semibold">Notificaciones</p>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={loading}
              className="xs font-medium text-brand-1 hover:underline disabled:opacity-50"
            >
              Marcar todas leídas
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <p className="small p-4 text-center text-muted-foreground">No tenés notificaciones.</p>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => !n.read_at && handleMarkRead(n.id)}
                className={`block w-full border-b px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-muted/50 ${
                  n.read_at ? "opacity-60" : "bg-brand-1/5"
                }`}
              >
                <div className="flex items-start gap-2">
                  {!n.read_at && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-1" />}
                  <div className="min-w-0">
                    <p className="small font-medium text-foreground">{n.data.titulo ?? "Notificación"}</p>
                    {n.data.mensaje && (
                      <p className="xs mt-0.5 text-muted-foreground">{n.data.mensaje}</p>
                    )}
                    <p className="xs mt-1 text-muted-foreground/70">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
