<?php

namespace App\Notifications;

use App\Notifications\Channels\WebPushChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Se dispara desde el llm-service (Python), no desde acá — inserta
 * directamente en `notifications` con `type` = self::class, mismo patrón
 * que ya usa para leer `personal_access_tokens` sin pasar por HTTP a
 * Laravel. Esta clase existe para documentar el contrato exacto de forma
 * (`toDatabase`) que ese insert tiene que replicar, y por si algún día
 * Laravel necesita dispararla directamente.
 */
class LimiteIADiarioNotification extends Notification
{
    use Queueable;

    public function __construct(private int $limite)
    {
    }

    public function via($notifiable): array
    {
        return ['database', WebPushChannel::class];
    }

    private function mensaje(): string
    {
        return "Llegaste al límite diario de {$this->limite} consultas al asistente. Se reinicia mañana.";
    }

    public function toDatabase($notifiable): array
    {
        return [
            'titulo' => 'Límite diario de IA alcanzado',
            'mensaje' => $this->mensaje(),
            'limite' => $this->limite,
        ];
    }

    public function toWebPush($notifiable): array
    {
        return [
            'title' => 'Límite diario de IA alcanzado',
            'body' => $this->mensaje(),
            'data' => ['url' => '/dashboard'],
        ];
    }
}
