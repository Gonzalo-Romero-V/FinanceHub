<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\DeudaModel;
use App\Models\CuotaModel;
use App\Models\CuentaModel;
use App\Models\ConceptoModel;
use App\Models\MovimientoModel;
use App\Models\TipoMovimientoModel;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Exception;

class DeudaController
{
    // ─── Amortización ───────────────────────────────────────────────────────────

    private function generarCuotas(DeudaModel $deuda): array
    {
        $principal   = (float) $deuda->monto_original;
        $n           = (int) $deuda->plazo_meses;
        $fechaInicio = Carbon::parse($deuda->fecha_inicio);
        $saldo       = $principal;
        $cuotas      = [];

        switch ($deuda->sistema) {

            case 'frances':
                if ($deuda->cuota_directa !== null) {
                    $cuotaFija = (float) $deuda->cuota_directa;
                    for ($k = 1; $k <= $n; $k++) {
                        $saldo = round(max(0.0, $saldo - $cuotaFija), 2);
                        $cuotas[] = $this->filaCuota($deuda->id, $k, $fechaInicio->copy()->addMonths($k), round($cuotaFija, 2), null, null, $saldo);
                    }
                } else {
                    $i = (float) $deuda->tasa_mensual / 100;
                    $cuotaFija = $i > 0
                        ? $principal * $i / (1 - pow(1 + $i, -$n))
                        : $principal / $n;

                    for ($k = 1; $k <= $n; $k++) {
                        $interes = round($saldo * $i, 2);
                        $capital = $k < $n
                            ? round($cuotaFija - $interes, 2)
                            : round($saldo, 2);

                        $saldo = round(max(0.0, $saldo - $capital), 2);
                        $cuotas[] = $this->filaCuota($deuda->id, $k, $fechaInicio->copy()->addMonths($k), round($capital + $interes, 2), $capital, $interes, $saldo);
                    }
                }
                break;

            case 'aleman':
                $capitalFijo = $principal / $n;
                $i           = (float) $deuda->tasa_mensual / 100;

                for ($k = 1; $k <= $n; $k++) {
                    $interes = round($saldo * $i, 2);
                    $capital = $k < $n
                        ? round($capitalFijo, 2)
                        : round($saldo, 2);

                    $saldo = round(max(0.0, $saldo - $capital), 2);
                    $cuotas[] = $this->filaCuota($deuda->id, $k, $fechaInicio->copy()->addMonths($k), round($capital + $interes, 2), $capital, $interes, $saldo);
                }
                break;

            case 'bullet':
                $fechaVenc = $fechaInicio->copy()->addMonths($n);

                if ($deuda->total_informal !== null) {
                    $total = (float) $deuda->total_informal;
                    $cuotas[] = $this->filaCuota($deuda->id, 1, $fechaVenc, round($total, 2), null, null, 0.0);
                } else {
                    $i            = (float) $deuda->tasa_mensual / 100;
                    $interesTotal = round($principal * $i * $n, 2);
                    $total        = round($principal + $interesTotal, 2);
                    $cuotas[] = $this->filaCuota($deuda->id, 1, $fechaVenc, $total, round($principal, 2), $interesTotal, 0.0);
                }
                break;
        }

        return $cuotas;
    }

    private function filaCuota(int $deudaId, int $k, Carbon $fecha, float $total, ?float $capital, ?float $interes, float $saldo): array
    {
        return [
            'deuda_id'          => $deudaId,
            'numero_cuota'      => $k,
            'fecha_vencimiento' => $fecha->toDateString(),
            'cuota_total'       => $total,
            'capital'           => $capital,
            'interes'           => $interes,
            'saldo_restante'    => $saldo,
            'pagada'            => false,
            'fecha_pago'        => null,
            'movimiento_id'     => null,
        ];
    }

    // ─── Campos computados ───────────────────────────────────────────────────────

    private function enriquecer(DeudaModel $deuda): array
    {
        $cuotas      = $deuda->cuotas;
        $totalAPagar = round((float) $cuotas->sum('cuota_total'), 2);
        $montoPagado = round((float) $cuotas->where('pagada', true)->sum('cuota_total'), 2);
        $progresoPct = $totalAPagar > 0 ? round(($montoPagado / $totalAPagar) * 100, 1) : 0.0;

        $interesImplicito = null;
        if ($deuda->cuota_directa !== null || $deuda->total_informal !== null) {
            $interesImplicito = round($totalAPagar - $deuda->monto_original, 2);
        }

        $proximaCuota = $cuotas->where('pagada', false)->first();

        return array_merge($deuda->toArray(), [
            'cuotas'            => $cuotas->values()->toArray(),
            'total_cuotas'      => $cuotas->count(),
            'cuotas_pagadas'    => $cuotas->where('pagada', true)->count(),
            'monto_pagado'      => $montoPagado,
            'total_a_pagar'     => $totalAPagar,
            'saldo_pendiente'   => round((float) $cuotas->where('pagada', false)->sum('cuota_total'), 2),
            'progreso_pct'      => $progresoPct,
            'proxima_cuota'     => $proximaCuota,
            'interes_implicito' => $interesImplicito,
        ]);
    }

    // ─── Conceptos de sistema ────────────────────────────────────────────────────

    private function conceptoPadreDeudas(int $userId): ConceptoModel
    {
        $tipo = TipoMovimientoModel::where('nombre', 'Egreso')->firstOrFail();

        return ConceptoModel::firstOrCreate([
            'user_id'            => $userId,
            'tipo_movimiento_id' => $tipo->id,
            'nombre'             => 'Pago Deudas',
            'es_sistema'         => true,
            'parent_id'          => null,
        ]);
    }

    private function crearConceptoDeuda(int $userId, int $padreId, string $nombre): ConceptoModel
    {
        $tipo = TipoMovimientoModel::where('nombre', 'Egreso')->firstOrFail();

        return ConceptoModel::create([
            'user_id'            => $userId,
            'tipo_movimiento_id' => $tipo->id,
            'nombre'             => $nombre,
            'es_sistema'         => true,
            'parent_id'          => $padreId,
        ]);
    }

    // ─── Validación ─────────────────────────────────────────────────────────────

    private function validarLogicaNegocio(Request $request): ?string
    {
        $sistema  = $request->sistema;
        $monto    = (float) $request->monto_original;
        $n        = (int) $request->plazo_meses;
        $tasa     = $request->tasa_mensual !== null ? (float) $request->tasa_mensual : null;
        $cuotaDi  = $request->cuota_directa !== null ? (float) $request->cuota_directa : null;
        $informal = $request->total_informal !== null ? (float) $request->total_informal : null;

        if ($sistema === 'frances') {
            if ($cuotaDi === null && $tasa === null) {
                return 'El sistema Francés requiere tasa mensual o cuota directa.';
            }
            if ($cuotaDi !== null && round($cuotaDi * $n, 2) < $monto) {
                return 'La cuota × plazo no cubre el monto original. La deuda nunca quedaría saldada.';
            }
        }

        if ($sistema === 'aleman' && $tasa === null) {
            return 'El sistema Alemán requiere una tasa de interés mensual.';
        }

        if ($sistema === 'bullet') {
            if ($informal === null && $tasa === null) {
                return 'El pago único requiere tasa mensual o monto total a pagar.';
            }
            if ($informal !== null && $informal < $monto) {
                return 'El monto total a pagar no puede ser menor al capital original.';
            }
        }

        return null;
    }

    // ─── CRUD ────────────────────────────────────────────────────────────────────

    public function index()
    {
        $userId = auth()->id();
        $deudas = DeudaModel::with('cuotas')
            ->where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'data' => $deudas->map(fn($d) => $this->enriquecer($d))->values(),
        ], 200);
    }

    public function store(Request $request)
    {
        $request->validate([
            'nombre'         => 'required|string|max:100',
            'acreedor'       => 'nullable|string|max:100',
            'sistema'        => 'required|in:frances,aleman,bullet',
            'monto_original' => 'required|numeric|min:0.01',
            'plazo_meses'    => 'required|integer|min:1|max:600',
            'fecha_inicio'   => 'required|date',
            'tasa_mensual'   => 'nullable|numeric|min:0|max:100',
            'cuota_directa'  => 'nullable|numeric|min:0.01',
            'total_informal' => 'nullable|numeric|min:0.01',
            'notas'          => 'nullable|string|max:1000',
        ]);

        $error = $this->validarLogicaNegocio($request);
        if ($error) {
            return response()->json(['mensaje' => $error], 422);
        }

        $userId = auth()->id();

        try {
            $deuda = null;
            DB::transaction(function () use ($request, $userId, &$deuda) {
                $deuda = DeudaModel::create([
                    'user_id'        => $userId,
                    'nombre'         => $request->nombre,
                    'acreedor'       => $request->acreedor,
                    'sistema'        => $request->sistema,
                    'monto_original' => (float) $request->monto_original,
                    'plazo_meses'    => (int) $request->plazo_meses,
                    'fecha_inicio'   => $request->fecha_inicio,
                    'tasa_mensual'   => $request->tasa_mensual !== null ? (float) $request->tasa_mensual : null,
                    'cuota_directa'  => $request->cuota_directa !== null ? (float) $request->cuota_directa : null,
                    'total_informal' => $request->total_informal !== null ? (float) $request->total_informal : null,
                    'notas'          => $request->notas,
                    'estado'         => 'activa',
                ]);

                DB::table('cuotas')->insert($this->generarCuotas($deuda));

                // Crear concepto hijo bajo "Pago Deudas" para registro desde movimientos
                $padre    = $this->conceptoPadreDeudas($userId);
                $concepto = $this->crearConceptoDeuda($userId, $padre->id, $deuda->nombre);
                $deuda->update(['concepto_id' => $concepto->id]);
            });

            $deuda->load('cuotas');
            return response()->json([
                'mensaje' => 'Deuda registrada exitosamente.',
                'data'    => $this->enriquecer($deuda),
            ], 201);

        } catch (Exception $e) {
            return response()->json(['mensaje' => 'Error al registrar la deuda: ' . $e->getMessage()], 500);
        }
    }

    public function show($id)
    {
        $userId = auth()->id();
        $deuda  = DeudaModel::with('cuotas')
            ->where('id', $id)
            ->where('user_id', $userId)
            ->firstOrFail();

        return response()->json(['data' => $this->enriquecer($deuda)], 200);
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'nombre'   => 'sometimes|string|max:100',
            'acreedor' => 'sometimes|nullable|string|max:100',
            'notas'    => 'sometimes|nullable|string|max:1000',
            'estado'   => 'sometimes|in:activa,pagada,cancelada',
        ]);

        $userId = auth()->id();
        $deuda  = DeudaModel::where('id', $id)->where('user_id', $userId)->firstOrFail();

        $datos = $request->only('nombre', 'acreedor', 'notas', 'estado');
        if (empty($datos)) {
            return response()->json(['mensaje' => 'No se enviaron campos para actualizar.'], 400);
        }

        $deuda->update($datos);

        // Sincronizar nombre del concepto hijo si cambió el nombre de la deuda
        if (isset($datos['nombre']) && $deuda->concepto_id) {
            ConceptoModel::where('id', $deuda->concepto_id)->update(['nombre' => $datos['nombre']]);
        }

        $deuda->load('cuotas');

        return response()->json([
            'mensaje' => 'Deuda actualizada.',
            'data'    => $this->enriquecer($deuda),
        ], 200);
    }

    public function destroy($id)
    {
        $userId     = auth()->id();
        $deuda      = DeudaModel::where('id', $id)->where('user_id', $userId)->firstOrFail();
        $conceptoId = $deuda->concepto_id;

        $deuda->delete();

        // Limpiar concepto hijo si no tiene movimientos asociados
        if ($conceptoId) {
            $tieneMovimientos = MovimientoModel::where('concepto_id', $conceptoId)->exists();
            if (!$tieneMovimientos) {
                ConceptoModel::where('id', $conceptoId)->delete();
            }
        }

        return response()->json(['mensaje' => 'Deuda eliminada.'], 200);
    }

    public function pagarCuota(Request $request, $deudaId, $cuotaId)
    {
        $request->validate([
            'cuenta_id' => 'nullable|integer',
        ]);

        $userId = auth()->id();
        $deuda  = DeudaModel::where('id', $deudaId)->where('user_id', $userId)->firstOrFail();
        $cuota  = CuotaModel::where('id', $cuotaId)
            ->where('deuda_id', $deuda->id)
            ->where('pagada', false)
            ->firstOrFail();

        $movimientoId = null;

        try {
            DB::transaction(function () use ($request, $deuda, $cuota, $userId, &$movimientoId) {
                if ($request->cuenta_id) {
                    $cuenta = CuentaModel::where('id', $request->cuenta_id)->where('user_id', $userId)->firstOrFail();

                    // Usar el concepto específico de esta deuda; fallback al padre si no existe
                    $conceptoId = $deuda->concepto_id ?? $this->conceptoPadreDeudas($userId)->id;

                    $movimiento = MovimientoModel::create([
                        'monto'             => $cuota->cuota_total,
                        'concepto_id'       => $conceptoId,
                        'cuenta_origen_id'  => $cuenta->id,
                        'cuenta_destino_id' => null,
                        'nota'              => "Cuota #{$cuota->numero_cuota} — {$deuda->nombre}",
                        'fecha'             => CarbonImmutable::now('UTC'),
                    ]);

                    $cuenta->decrement('saldo', $cuota->cuota_total);
                    $movimientoId = $movimiento->id;
                }

                $cuota->update([
                    'pagada'        => true,
                    'fecha_pago'    => CarbonImmutable::now('UTC'),
                    'movimiento_id' => $movimientoId,
                ]);

                $pendientes = CuotaModel::where('deuda_id', $deuda->id)->where('pagada', false)->count();
                if ($pendientes === 0) {
                    $deuda->update(['estado' => 'pagada']);
                }
            });

            $deuda->load('cuotas');
            return response()->json([
                'mensaje' => 'Cuota registrada como pagada.',
                'data'    => $this->enriquecer($deuda),
            ], 200);

        } catch (Exception $e) {
            return response()->json(['mensaje' => 'Error al registrar el pago: ' . $e->getMessage()], 500);
        }
    }
}
