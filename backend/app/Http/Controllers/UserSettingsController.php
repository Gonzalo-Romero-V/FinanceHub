<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\UserSettingsModel;

class UserSettingsController
{
    public function show()
    {
        $userId   = auth()->id();
        $settings = UserSettingsModel::firstOrCreate(['user_id' => $userId], ['onboarding_seen' => []]);

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
        $settings = UserSettingsModel::firstOrCreate(['user_id' => $userId], ['onboarding_seen' => []]);

        $tipo       = $request->input('reconciliacion_tipo', $settings->reconciliacion_tipo ?? 'ninguno');
        $diaSemana  = $request->input('reconciliacion_dia_semana', $settings->reconciliacion_dia_semana);
        $diaMes     = $request->input('reconciliacion_dia_mes', $settings->reconciliacion_dia_mes);
        $frecuencia = $request->input('reconciliacion_frecuencia_dias', $settings->reconciliacion_frecuencia_dias);

        $settings->fill([
            'reconciliacion_tipo'            => $tipo,
            'reconciliacion_dia_semana'      => $diaSemana,
            'reconciliacion_dia_mes'         => $diaMes,
            'reconciliacion_frecuencia_dias' => $frecuencia,
        ]);
        $settings->reconciliacion_proxima = $settings->calcularProximaReconciliacion();
        $settings->save();

        return response()->json([
            'mensaje' => 'Configuración actualizada',
            'data'    => $settings,
        ], 200);
    }

    /**
     * PATCH /user-settings/onboarding
     *
     * Marca una o más claves de onboarding (coach marks / carrusel) como ya
     * vistas para el usuario autenticado. Body: { keys: string[] }.
     */
    public function markOnboardingSeen(Request $request)
    {
        $request->validate([
            'keys'   => 'required|array|min:1',
            'keys.*' => 'string',
        ]);

        $userId   = auth()->id();
        $settings = UserSettingsModel::firstOrCreate(['user_id' => $userId], ['onboarding_seen' => []]);

        $seen = $settings->onboarding_seen ?? [];
        foreach ($request->input('keys') as $key) {
            $seen[$key] = true;
        }
        $settings->update(['onboarding_seen' => $seen]);

        return response()->json([
            'mensaje' => 'Onboarding actualizado',
            'data'    => $settings,
        ], 200);
    }

    /**
     * POST /user-settings/onboarding/reset
     *
     * Reinicia claves de onboarding para volver a mostrar las coach marks
     * correspondientes. Body: { keys?: string[] } — si se omite `keys` (o
     * viene vacío), reinicia TODO (incluido el carrusel de bienvenida).
     */
    public function resetOnboarding(Request $request)
    {
        $request->validate([
            'keys'   => 'sometimes|array',
            'keys.*' => 'string',
        ]);

        $userId   = auth()->id();
        $settings = UserSettingsModel::firstOrCreate(['user_id' => $userId], ['onboarding_seen' => []]);

        $keys = $request->input('keys', []);
        if (empty($keys)) {
            $settings->update(['onboarding_seen' => []]);
        } else {
            $seen = $settings->onboarding_seen ?? [];
            foreach ($keys as $key) {
                unset($seen[$key]);
            }
            $settings->update(['onboarding_seen' => $seen]);
        }

        return response()->json([
            'mensaje' => 'Onboarding reiniciado',
            'data'    => $settings,
        ], 200);
    }

}
