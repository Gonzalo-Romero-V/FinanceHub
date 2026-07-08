<?php

namespace App\Notifications;

use App\Notifications\Channels\WebPushChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class PresupuestoUmbralNotification extends Notification
{
    use Queueable;

    public function __construct(
        private int $presupuestoId,
        private string $conceptoNombre,
        private float $pctActual,
        private float $montoPresupuesto,
    ) {
    }

    private function mensaje(): string
    {
        $pct = round($this->pctActual);
        $monto = number_format($this->montoPresupuesto, 2);
        return "Ya usaste el {$pct}% de tu presupuesto de \"{$this->conceptoNombre}\" (\${$monto}).";
    }

    public function via($notifiable): array
    {
        return ['database', WebPushChannel::class];
    }

    public function toDatabase($notifiable): array
    {
        return [
            'titulo' => 'Alerta de presupuesto',
            'mensaje' => $this->mensaje(),
            'presupuesto_id' => $this->presupuestoId,
            'pct_actual' => $this->pctActual,
        ];
    }

    public function toWebPush($notifiable): array
    {
        return [
            'title' => 'Alerta de presupuesto',
            'body' => $this->mensaje(),
            'data' => ['url' => '/presupuestos'],
        ];
    }
}
