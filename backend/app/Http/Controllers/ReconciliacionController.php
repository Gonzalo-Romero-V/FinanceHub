<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\CuentaModel;
use App\Models\ConceptoModel;
use App\Models\MovimientoModel;
use App\Models\ReconciliacionModel;
use App\Models\TipoMovimientoModel;
use App\Models\UserSettingsModel;
use Illuminate\Support\Facades\DB;
use Carbon\CarbonImmutable;
use Exception;

class ReconciliacionController
{
    // ─── Helpers ────────────────────────────────────────────────────────────────

    /**
     * Devuelve (o crea) el concepto de sistema "Ajuste de conciliación"
     * para el tipo indicado ('Ingreso' o 'Egreso') del usuario dado.
     */
    private function conceptoAjuste(int $userId, string $tipoNombre): ConceptoModel
    {
        $tipo = TipoMovimientoModel::where('nombre', $tipoNombre)->firstOrFail();

        return ConceptoModel::firstOrCreate(
            [
                'user_id'           => $userId,
                'tipo_movimiento_id' => $tipo->id,
                'es_sistema'        => true,
            ],
            ['nombre' => 'Ajuste de conciliación']
        );
    }

    // ─── Endpoints ──────────────────────────────────────────────────────────────

    /**
     * GET /cuentas/{id}/reconciliaciones
     * Historial de reconciliaciones de una cuenta del usuario.
     */
    public function index($cuentaId)
    {
        $userId = auth()->id();

        CuentaModel::where('id', $cuentaId)
            ->where('user_id', $userId)
            ->firstOrFail();

        $data = ReconciliacionModel::where('cuenta_id', $cuentaId)
            ->where('user_id', $userId)
            ->with(['movimientoAjuste.concepto.tipoMovimiento'])
            ->orderBy('fecha', 'desc')
            ->get();

        return response()->json(['data' => $data], 200);
    }

    /**
     * POST /cuentas/{id}/reconciliar
     *
     * Body:
     *   saldo_real     numeric required  — saldo real que el usuario reporta
     *   crear_ajuste   boolean optional  — si true (default) y hay diferencia, crea movimiento de ajuste
     *   nota           string  optional
     */
    public function store(Request $request, $cuentaId)
    {
        $request->validate([
            'saldo_real'    => 'required|numeric|min:0',
            'crear_ajuste'  => 'sometimes|boolean',
            'nota'          => 'nullable|string|max:255',
        ]);

        $userId      = auth()->id();
        $crearAjuste = $request->boolean('crear_ajuste', true);

        $cuenta = CuentaModel::where('id', $cuentaId)
            ->where('user_id', $userId)
            ->firstOrFail();

        $saldoReal    = (float) $request->saldo_real;
        $saldoSistema = (float) $cuenta->saldo;
        $diferencia   = round($saldoReal - $saldoSistema, 2);

        $reconciliacion = null;

        try {
            DB::transaction(function () use (
                $userId, $cuenta, $saldoReal, $saldoSistema, $diferencia,
                $crearAjuste, $request, &$reconciliacion
            ) {
                $movimientoAjusteId = null;

                if ($diferencia != 0 && $crearAjuste) {
                    $tipoNombre = $diferencia > 0 ? 'Ingreso' : 'Egreso';
                    $concepto   = $this->conceptoAjuste($userId, $tipoNombre);
                    $montoAbs   = abs($diferencia);

                    $payload = [
                        'monto'      => $montoAbs,
                        'concepto_id' => $concepto->id,
                        'nota'       => 'Ajuste automático de conciliación',
                        'fecha'      => CarbonImmutable::now('UTC'),
                    ];

                    if ($tipoNombre === 'Ingreso') {
                        $payload['cuenta_destino_id'] = $cuenta->id;
                        $payload['cuenta_origen_id']  = null;
                        $cuenta->increment('saldo', $montoAbs);
                    } else {
                        $payload['cuenta_origen_id']  = $cuenta->id;
                        $payload['cuenta_destino_id'] = null;
                        $cuenta->decrement('saldo', $montoAbs);
                    }

                    $movimiento         = MovimientoModel::create($payload);
                    $movimientoAjusteId = $movimiento->id;
                }

                $reconciliacion = ReconciliacionModel::create([
                    'cuenta_id'           => $cuenta->id,
                    'user_id'             => $userId,
                    'saldo_real'          => $saldoReal,
                    'saldo_sistema'       => $saldoSistema,
                    'diferencia'          => $diferencia,
                    'movimiento_ajuste_id' => $movimientoAjusteId,
                    'nota'                => $request->nota,
                    'fecha'               => CarbonImmutable::now('UTC'),
                ]);

                // Reprogramar la próxima fecha de reconciliación (cualquier
                // tipo de calendario configurado, no solo "personalizado" —
                // antes solo avanzaba si había reconciliacion_frecuencia_dias).
                $settings = UserSettingsModel::where('user_id', $userId)->first();
                if ($settings) {
                    $settings->update([
                        'reconciliacion_proxima' => $settings->calcularProximaReconciliacion(),
                    ]);
                }
            });

            return response()->json([
                'mensaje' => 'Reconciliación registrada exitosamente',
                'data'    => $reconciliacion->load('movimientoAjuste.concepto.tipoMovimiento'),
            ], 201);

        } catch (Exception $e) {
            return response()->json([
                'mensaje' => 'Error al registrar la reconciliación: ' . $e->getMessage(),
            ], 500);
        }
    }
}
