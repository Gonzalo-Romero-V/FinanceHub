<?php

namespace App\Notifications;

use App\Notifications\Channels\WebPushChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class ReconciliacionProximaNotification extends Notification
{
    use Queueable;

    /**
     * @param bool $vencida true si la fecha ya pasó, false si está próxima (dentro del umbral)
     */
    public function __construct(
        private bool $vencida,
        private string $fecha,
    ) {
    }

    public function via($notifiable): array
    {
        return ['database', WebPushChannel::class];
    }

    private function titulo(): string
    {
        return $this->vencida ? 'Reconciliación vencida' : 'Reconciliación próxima';
    }

    private function mensaje(): string
    {
        return $this->vencida
            ? "Tu reconciliación programada del {$this->fecha} ya venció. Revisá tus cuentas cuando puedas."
            : "Tenés una reconciliación programada para el {$this->fecha}.";
    }

    public function toDatabase($notifiable): array
    {
        return [
            'titulo' => $this->titulo(),
            'mensaje' => $this->mensaje(),
            'fecha' => $this->fecha,
            'vencida' => $this->vencida,
        ];
    }

    public function toWebPush($notifiable): array
    {
        return [
            'title' => $this->titulo(),
            'body' => $this->mensaje(),
            'data' => ['url' => '/cuentas'],
        ];
    }
}
