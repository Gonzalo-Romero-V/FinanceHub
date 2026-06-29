<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\UserSettingsModel;
use Carbon\Carbon;

class UserSettingsController
{
    public function show()
    {
        $userId   = auth()->id();
        $settings = UserSettingsModel::firstOrCreate(['user_id' => $userId]);

        return response()->json(['data' => $settings], 200);
    }

    /**
     * PATCH /user-settings
     *
     * Body (todos opcionales):
     *   reconciliacion_tipo          string   ninguno|semanal|quincenal|mensual|personalizado
     *   reconciliacion_dia_semana    int|null  1 (lun) … 7 (dom)  — para semanal/quincenal
     *   reconciliacion_dia_mes       int|null  1–28 o 0 (último día del mes) — para mensual
     *   reconciliacion_frecuencia_dias int|null — solo para tipo 'personalizado'
     */
    public function update(Request $request)
    {
        $request->validate([
            'reconciliacion_tipo'          => 'nullable|string|in:ninguno,semanal,quincenal,mensual,personalizado',
            'reconciliacion_dia_semana'    => 'nullable|integer|min:1|max:7',
            'reconciliacion_dia_mes'       => 'nullable|integer|min:0|max:28',
            'reconciliacion_frecuencia_dias' => 'nullable|integer|min:1|max:365',
        ]);

        $userId   = auth()->id();
        $settings = UserSettingsModel::firstOrCreate(['user_id' => $userId]);

        $tipo       = $request->input('reconciliacion_tipo', $settings->reconciliacion_tipo ?? 'ninguno');
        $diaSemana  = $request->input('reconciliacion_dia_semana', $settings->reconciliacion_dia_semana);
        $diaMes     = $request->input('reconciliacion_dia_mes', $settings->reconciliacion_dia_mes);
        $frecuencia = $request->input('reconciliacion_frecuencia_dias', $settings->reconciliacion_frecuencia_dias);

        $proxima = $this->calcularProxima($tipo, $diaSemana, $diaMes, $frecuencia);

        $settings->update([
            'reconciliacion_tipo'            => $tipo,
            'reconciliacion_dia_semana'      => $diaSemana,
            'reconciliacion_dia_mes'         => $diaMes,
            'reconciliacion_frecuencia_dias' => $frecuencia,
            'reconciliacion_proxima'         => $proxima,
        ]);

        return response()->json([
            'mensaje' => 'Configuración actualizada',
            'data'    => $settings,
        ], 200);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function calcularProxima(string $tipo, ?int $diaSemana, ?int $diaMes, ?int $frecuencia): ?string
    {
        $hoy = Carbon::today();

        switch ($tipo) {
            case 'semanal':
                // Próximo día-de-semana indicado (ISO: 1=lun, 7=dom)
                return $this->proximoDiaSemana($hoy, $diaSemana ?? 1)->toDateString();

            case 'quincenal':
                // Próximo día-de-semana y el siguiente ocurre 14 días después
                return $this->proximoDiaSemana($hoy, $diaSemana ?? 1)->toDateString();

            case 'mensual':
                return $this->proximoDiaMes($hoy, $diaMes ?? 1)->toDateString();

            case 'personalizado':
                return $frecuencia ? $hoy->addDays($frecuencia)->toDateString() : null;

            default:
                return null;
        }
    }

    private function proximoDiaSemana(Carbon $desde, int $iso): Carbon
    {
        // Carbon::dayOfWeek: 0=dom, 1=lun...6=sab
        // ISO: 1=lun...7=dom → convertir
        $carbonDay = $iso === 7 ? 0 : $iso;
        $next = $desde->copy()->next($carbonDay);
        return $next->isAfter($desde) ? $next : $next->addWeek();
    }

    private function proximoDiaMes(Carbon $desde, int $dia): Carbon
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
