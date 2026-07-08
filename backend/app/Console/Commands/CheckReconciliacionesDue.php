<?php

namespace App\Console\Commands;

use App\Models\UserModel;
use App\Models\UserSettingsModel;
use App\Notifications\ReconciliacionProximaNotification;
use Carbon\Carbon;
use Illuminate\Console\Command;

class CheckReconciliacionesDue extends Command
{
    protected $signature = 'notificaciones:reconciliaciones';
    protected $description = 'Notifica reconciliaciones próximas (dentro de 3 días) o vencidas';

    private const DIAS_ANTICIPACION = 3;

    public function handle(): int
    {
        $hoy = Carbon::today();
        $limite = $hoy->copy()->addDays(self::DIAS_ANTICIPACION);

        $pendientes = UserSettingsModel::whereNotNull('reconciliacion_proxima')
            ->where('reconciliacion_proxima', '<=', $limite->toDateString())
            ->get();

        $enviadas = 0;

        foreach ($pendientes as $settings) {
            $user = UserModel::find($settings->user_id);
            if (!$user) continue;

            $fecha = Carbon::parse($settings->reconciliacion_proxima);
            $vencida = $fecha->isPast();

            // No repetir el aviso todos los días mientras siga pendiente: se
            // salta si ya existe una notificación para esta misma fecha.
            // (la columna `data` es texto plano, no jsonb, así que se
            // compara en PHP en vez de un query JSON path a nivel SQL —
            // el volumen es bajo, corre una vez al día).
            $yaNotificado = $user->notifications()
                ->where('type', ReconciliacionProximaNotification::class)
                ->get()
                ->contains(fn($n) => ($n->data['fecha'] ?? null) === $fecha->toDateString());
            if ($yaNotificado) continue;

            $user->notify(new ReconciliacionProximaNotification($vencida, $fecha->toDateString()));
            $enviadas++;
        }

        $this->info("Notificaciones de reconciliación enviadas: {$enviadas}");
        return self::SUCCESS;
    }
}
