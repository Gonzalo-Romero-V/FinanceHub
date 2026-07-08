<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class UserSettingsModel extends Model
{
    protected $table = 'user_settings';
    protected $primaryKey = 'id';
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'reconciliacion_tipo',
        'reconciliacion_dia_semana',
        'reconciliacion_dia_mes',
        'reconciliacion_frecuencia_dias',
        'reconciliacion_proxima',
        'onboarding_seen',
    ];

    protected $casts = [
        'reconciliacion_tipo'            => 'string',
        'reconciliacion_dia_semana'      => 'integer',
        'reconciliacion_dia_mes'         => 'integer',
        'reconciliacion_frecuencia_dias' => 'integer',
        'reconciliacion_proxima'         => 'date',
        'onboarding_seen'                => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(UserModel::class, 'user_id');
    }

    /**
     * Calcula la próxima fecha de reconciliación a partir de la
     * configuración actual del registro (tipo/día/frecuencia). Compartida
     * entre `UserSettingsController::update()` (cuando el usuario cambia su
     * preferencia) y `ReconciliacionController::store()` (para reprogramar
     * después de reconciliar) — antes vivía duplicada/incompleta en cada
     * lugar, lo que hacía que solo el tipo "personalizado" avanzara
     * correctamente tras reconciliar.
     */
    public function calcularProximaReconciliacion(): ?string
    {
        $hoy = Carbon::today();

        return match ($this->reconciliacion_tipo) {
            'semanal', 'quincenal' => self::proximoDiaSemana($hoy, $this->reconciliacion_dia_semana ?? 1)->toDateString(),
            'mensual' => self::proximoDiaMes($hoy, $this->reconciliacion_dia_mes ?? 1)->toDateString(),
            'personalizado' => $this->reconciliacion_frecuencia_dias
                ? $hoy->addDays($this->reconciliacion_frecuencia_dias)->toDateString()
                : null,
            default => null,
        };
    }

    private static function proximoDiaSemana(Carbon $desde, int $iso): Carbon
    {
        // Carbon::dayOfWeek: 0=dom, 1=lun...6=sab. ISO: 1=lun...7=dom.
        $carbonDay = $iso === 7 ? 0 : $iso;
        $next = $desde->copy()->next($carbonDay);
        return $next->isAfter($desde) ? $next : $next->addWeek();
    }

    private static function proximoDiaMes(Carbon $desde, int $dia): Carbon
    {
        if ($dia === 0) {
            // Último día del mes
            $candidate = $desde->copy()->endOfMonth()->startOfDay();
            return $candidate->gt($desde) ? $candidate : $desde->copy()->addMonthNoOverflow()->endOfMonth()->startOfDay();
        }
        $candidate = Carbon::create($desde->year, $desde->month, min($dia, $desde->daysInMonth));
        if (!$candidate->gt($desde)) {
            $candidate = $candidate->addMonthNoOverflow();
            $candidate->day = min($dia, $candidate->daysInMonth);
        }
        return $candidate;
    }
}
