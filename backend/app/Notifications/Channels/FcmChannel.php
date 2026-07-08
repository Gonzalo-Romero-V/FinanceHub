<?php

namespace App\Notifications\Channels;

use App\Services\FcmSender;
use Illuminate\Notifications\Notification;

class FcmChannel
{
    public function __construct(private FcmSender $sender)
    {
    }

    public function send($notifiable, Notification $notification): void
    {
        // Todas las notificaciones que soportan push ya definen toWebPush()
        // (mismo shape {title, body, data}) — se reutiliza para no duplicar
        // el mensaje en cada clase con un toFcm() idéntico.
        if (!method_exists($notification, 'toWebPush')) return;

        $payload = $notification->toWebPush($notifiable);
        if (!$payload) return;

        $this->sender->sendToUser(
            $notifiable->getKey(),
            $payload['title'],
            $payload['body'],
            $payload['data'] ?? [],
        );
    }
}
