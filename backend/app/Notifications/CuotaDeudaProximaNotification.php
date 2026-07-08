<?php

namespace App\Notifications;

use App\Models\CuotaModel;
use App\Notifications\Channels\WebPushChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class CuotaDeudaProximaNotification extends Notification
{
    use Queueable;

    public function __construct(private CuotaModel $cuota)
    {
    }

    public function via($notifiable): array
    {
        return ['database', WebPushChannel::class];
    }

    private function vencida(): bool
    {
        return $this->cuota->fecha_vencimiento->isPast();
    }

    private function titulo(): string
    {
        return $this->vencida() ? 'Cuota de deuda vencida' : 'Cuota de deuda próxima a vencer';
    }

    private function mensaje(): string
    {
        $nombre = $this->cuota->deuda->nombre;
        $fecha = $this->cuota->fecha_vencimiento->toDateString();
        $monto = number_format((float) $this->cuota->cuota_total, 2);

        return $this->vencida()
            ? "La cuota #{$this->cuota->numero_cuota} de \"{$nombre}\" (\${$monto}) venció el {$fecha}."
            : "La cuota #{$this->cuota->numero_cuota} de \"{$nombre}\" (\${$monto}) vence el {$fecha}.";
    }

    public function toDatabase($notifiable): array
    {
        return [
            'titulo' => $this->titulo(),
            'mensaje' => $this->mensaje(),
            'deuda_id' => $this->cuota->deuda_id,
            'cuota_id' => $this->cuota->id,
            'vencida' => $this->vencida(),
        ];
    }

    public function toWebPush($notifiable): array
    {
        return [
            'title' => $this->titulo(),
            'body' => $this->mensaje(),
            'data' => ['url' => '/deudas'],
        ];
    }
}
