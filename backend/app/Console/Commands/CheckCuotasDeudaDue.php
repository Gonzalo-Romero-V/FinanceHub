<?php

namespace App\Console\Commands;

use App\Models\CuotaModel;
use App\Models\UserModel;
use App\Notifications\CuotaDeudaProximaNotification;
use Carbon\Carbon;
use Illuminate\Console\Command;

class CheckCuotasDeudaDue extends Command
{
    protected $signature = 'notificaciones:cuotas-deuda';
    protected $description = 'Notifica cuotas de deuda próximas a vencer (dentro de 3 días) o vencidas';

    private const DIAS_ANTICIPACION = 3;

    public function handle(): int
    {
        $limite = Carbon::today()->addDays(self::DIAS_ANTICIPACION);

        $cuotas = CuotaModel::where('pagada', false)
            ->whereDate('fecha_vencimiento', '<=', $limite)
            ->whereHas('deuda', fn($q) => $q->where('estado', 'activa'))
            ->with('deuda')
            ->get();

        $enviadas = 0;

        foreach ($cuotas as $cuota) {
            $user = UserModel::find($cuota->deuda->user_id);
            if (!$user) continue;

            $yaNotificado = $user->notifications()
                ->where('type', CuotaDeudaProximaNotification::class)
                ->get()
                ->contains(fn($n) => ($n->data['cuota_id'] ?? null) === $cuota->id);
            if ($yaNotificado) continue;

            $user->notify(new CuotaDeudaProximaNotification($cuota));
            $enviadas++;
        }

        $this->info("Notificaciones de cuotas de deuda enviadas: {$enviadas}");
        return self::SUCCESS;
    }
}
