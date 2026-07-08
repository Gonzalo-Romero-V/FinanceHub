// Service worker mínimo para Web Push. No cachea nada (no es un PWA
// offline-first en web — el respaldo offline es exclusivo de la app
// Android vía Capacitor, ver lib/offline/), solo recibe pushes y los
// muestra como notificación del sistema.

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "FinanceHub", body: event.data.text() };
  }

  const title = payload.title ?? "FinanceHub";
  const options = {
    body: payload.body ?? "",
    icon: "/assets/icon-192.png",
    data: { url: payload.url ?? "/dashboard" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/dashboard";
  event.waitUntil(clients.openWindow(url));
});
