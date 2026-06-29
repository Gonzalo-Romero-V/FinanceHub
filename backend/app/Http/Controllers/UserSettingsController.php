<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\UserSettingsModel;
use Carbon\Carbon;
use Exception;

class UserSettingsController
{
    /**
     * GET /user-settings
     * Devuelve (o crea lazy) la configuración del usuario autenticado.
     */
    public function show()
    {
        $userId   = auth()->id();
        $settings = UserSettingsModel::firstOrCreate(['user_id' => $userId]);

        return response()->json(['data' => $settings], 200);
    }

    /**
     * PATCH /user-settings
     *
     * Body:
     *   reconciliacion_frecuencia_dias  int|null  — días entre recordatorios; null desactiva
     */
    public function update(Request $request)
    {
        $request->validate([
            'reconciliacion_frecuencia_dias' => 'nullable|integer|min:1|max:365',
        ]);

        $userId   = auth()->id();
        $settings = UserSettingsModel::firstOrCreate(['user_id' => $userId]);

        $frecuencia = $request->has('reconciliacion_frecuencia_dias')
            ? $request->reconciliacion_frecuencia_dias
            : $settings->reconciliacion_frecuencia_dias;

        $proxima = null;
        if ($frecuencia) {
            // Si ya hay una fecha próxima calculada, la respetamos; si no, calculamos desde hoy.
            $proxima = $settings->reconciliacion_proxima
                ?? Carbon::now()->addDays($frecuencia)->toDateString();
        }

        $settings->update([
            'reconciliacion_frecuencia_dias' => $frecuencia,
            'reconciliacion_proxima'         => $proxima,
        ]);

        return response()->json([
            'mensaje' => 'Configuración actualizada',
            'data'    => $settings,
        ], 200);
    }
}
