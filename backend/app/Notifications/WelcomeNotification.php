<?php

namespace App\Notifications;

use App\Notifications\Channels\WebPushChannel;
use App\Notifications\Channels\FcmChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Se dispara una sola vez, la primera vez que un usuario registra un canal
 * de notificaciones (ver PushSubscriptionController::store) — sirve como
 * prueba real de punta a punta de que el envío funciona, no solo que el
 * permiso del dispositivo está concedido.
 */
class WelcomeNotification extends Notification
{
    use Queueable;

    private function mensaje(): string
    {
        return 'Las notificaciones están activas. Te avisaremos de reconciliaciones próximas, '
            . 'alertas de presupuesto y cuotas de deuda por vencer.';
    }

    public function via($notifiable): array
    {
        return ['database', WebPushChannel::class, FcmChannel::class];
    }

    public function toDatabase($notifiable): array
    {
        return [
            'titulo' => '¡Bienvenido a FinanceHub!',
            'mensaje' => $this->mensaje(),
        ];
    }

    public function toWebPush($notifiable): array
    {
        return [
            'title' => '¡Bienvenido a FinanceHub!',
            'body' => $this->mensaje(),
            'data' => ['url' => '/dashboard'],
        ];
    }
}
