<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\MovimientoModel;
use App\Models\CuentaModel;
use App\Models\ConceptoModel;
use Illuminate\Support\Facades\DB;
use Carbon\CarbonImmutable;
use Exception;

class MovimientoController
{
    // ─── Helpers ────────────────────────────────────────────────────────────────

    /**
     * Devuelve el nombre del tipo de movimiento dado un concepto_id.
     * Los posibles valores son: 'Ingreso', 'Egreso', 'Transferencia'.
     */
    private function getTipoMovimiento(int $conceptoId): string
    {
        $concepto = ConceptoModel::with('tipoMovimiento')->find($conceptoId);
        return $concepto?->tipoMovimiento?->nombre ?? 'Egreso';
    }

    /**
     * Aplica el efecto de un movimiento sobre los saldos de las cuentas.
     * $factor = +1 para aplicar, -1 para revertir.
     */
    private function aplicarEfectoSaldo(string $tipo, float $monto, ?int $cuentaOrigenId, ?int $cuentaDestinoId, int $factor): void
    {
        if ($tipo === 'Egreso' && $cuentaOrigenId) {
            CuentaModel::where('id', $cuentaOrigenId)->decrement('saldo', $monto * $factor);
        } elseif ($tipo === 'Ingreso' && $cuentaDestinoId) {
            CuentaModel::where('id', $cuentaDestinoId)->increment('saldo', $monto * $factor);
        } elseif ($tipo === 'Transferencia') {
            if ($cuentaOrigenId) {
                CuentaModel::where('id', $cuentaOrigenId)->decrement('saldo', $monto * $factor);
            }
            if ($cuentaDestinoId) {
                CuentaModel::where('id', $cuentaDestinoId)->increment('saldo', $monto * $factor);
            }
        }
    }

    /**
     * TZ del cliente (header X-Client-Timezone, IANA). Default UTC.
     */
    private function clientTimezone(Request $request): string
    {
        $tz = (string) $request->header('X-Client-Timezone', 'UTC');
        try {
            new \DateTimeZone($tz);
            return $tz;
        } catch (Exception $e) {
            return 'UTC';
        }
    }

    /**
     * Verdadero si el timestamp dado cae en el "hoy" del cliente.
     * Compara YYYY-MM-DD en la TZ del cliente.
     */
    private function esDelDiaActual($fecha, string $tz): bool
    {
        if ($fecha === null) return false;
        $f = CarbonImmutable::parse($fecha, 'UTC')->setTimezone($tz);
        $hoy = CarbonImmutable::now($tz);
        return $f->isSameDay($hoy);
    }

    // ─── CRUD ────────────────────────────────────────────────────────────────────

    // LISTAR movimientos del usuario
    public function index()
    {
        $userId = auth()->id();

        $data = MovimientoModel::with(['concepto.tipoMovimiento', 'cuentaOrigen', 'cuentaDestino'])
            ->whereHas('cuentaOrigen', fn($q) => $q->where('user_id', $userId))
            ->orWhereHas('cuentaDestino', fn($q) => $q->where('user_id', $userId))
            ->orderBy('fecha', 'desc')
            ->get();

        return response()->json([
            'mensaje' => 'Lista de Movimientos',
            'data'    => $data
        ], 200);
    }

    // CREAR nuevo movimiento
    public function store(Request $request)
    {
        $request->validate([
            'monto'            => 'required|numeric|min:0.01',
            'cuenta_origen_id' => 'nullable|integer',
            'cuenta_destino_id'=> 'nullable|integer',
            'concepto_id'      => 'required|integer',
            'nota'             => 'nullable|string|max:255',
        ]);

        $userId = auth()->id();
        $tipo   = $this->getTipoMovimiento((int) $request->concepto_id);
        $monto  = (float) $request->monto;

        // Validamos que las cuentas referenciadas pertenezcan al usuario
        if ($request->cuenta_origen_id) {
            CuentaModel::where('id', $request->cuenta_origen_id)
                ->where('user_id', $userId)
                ->firstOrFail();
        }
        if ($request->cuenta_destino_id) {
            CuentaModel::where('id', $request->cuenta_destino_id)
                ->where('user_id', $userId)
                ->firstOrFail();
        }

        try {
            DB::transaction(function () use ($request, $tipo, $monto, &$nuevoMovimiento) {
                $payload = $request->only(
                    'monto', 'cuenta_origen_id', 'cuenta_destino_id', 'concepto_id', 'nota'
                );
                // La fecha del movimiento la dicta el servidor (UTC). Ignoramos
                // cualquier `fecha` que venga del cliente.
                $payload['fecha'] = CarbonImmutable::now('UTC');

                $nuevoMovimiento = MovimientoModel::create($payload);

                $this->aplicarEfectoSaldo(
                    $tipo,
                    $monto,
                    $request->cuenta_origen_id,
                    $request->cuenta_destino_id,
                    +1
                );
            });

            return response()->json([
                'mensaje' => 'Nuevo registro agregado exitosamente',
                'data'    => $nuevoMovimiento
            ], 201);

        } catch (Exception $e) {
            return response()->json([
                'mensaje' => 'Nuevo registro NO agregado: ' . $e->getMessage()
            ], 500);
        }
    }

    // VER un movimiento
    public function show($id)
    {
        $userId = auth()->id();

        $data = MovimientoModel::with(['concepto.tipoMovimiento', 'cuentaOrigen', 'cuentaDestino'])
            ->where('id', $id)
            ->where(function ($q) use ($userId) {
                $q->whereHas('cuentaOrigen',  fn($q) => $q->where('user_id', $userId))
                  ->orWhereHas('cuentaDestino', fn($q) => $q->where('user_id', $userId));
            })
            ->firstOrFail();

        return response()->json([
            'mensaje' => 'Registro encontrado: ID = ' . $id,
            'data'    => $data
        ], 200);
    }

    // ACTUALIZAR un movimiento
    public function update(Request $request, $id)
    {
        $request->validate([
            'monto'            => 'sometimes|required|numeric|min:0.01',
            'cuenta_origen_id' => 'sometimes|nullable|integer',
            'cuenta_destino_id'=> 'sometimes|nullable|integer',
            'concepto_id'      => 'sometimes|required|integer',
            'nota'             => 'sometimes|nullable|string|max:255',
        ]);

        $userId = auth()->id();

        $movimiento = MovimientoModel::with('concepto.tipoMovimiento')
            ->where('id', $id)
            ->where(function ($q) use ($userId) {
                $q->whereHas('cuentaOrigen',  fn($q) => $q->where('user_id', $userId))
                  ->orWhereHas('cuentaDestino', fn($q) => $q->where('user_id', $userId));
            })
            ->firstOrFail();

        // Regla de negocio: sólo se pueden editar movimientos del día actual del cliente.
        if (!$this->esDelDiaActual($movimiento->fecha, $this->clientTimezone($request))) {
            return response()->json([
                'mensaje' => 'Solo se pueden editar movimientos registrados hoy.'
            ], 403);
        }

        // La fecha es inmutable: ignoramos cualquier `fecha` que venga en el body.
        $datos = $request->only('monto', 'cuenta_origen_id', 'cuenta_destino_id', 'concepto_id', 'nota');

        if (empty($datos)) {
            return response()->json(['mensaje' => 'No se enviaron campos para actualizar'], 400);
        }

        try {
            DB::transaction(function () use ($movimiento, $datos) {
                // 1. Revertir el efecto del movimiento anterior
                $tipoAnterior = $movimiento->concepto?->tipoMovimiento?->nombre ?? 'Egreso';
                $this->aplicarEfectoSaldo(
                    $tipoAnterior,
                    (float) $movimiento->monto,
                    $movimiento->cuenta_origen_id,
                    $movimiento->cuenta_destino_id,
                    -1
                );

                // 2. Aplicar los nuevos datos (fecha no cambia)
                $movimiento->update($datos);
                $movimiento->refresh()->load('concepto.tipoMovimiento');

                // 3. Reaplicar con los nuevos valores
                $tipoNuevo = $movimiento->concepto?->tipoMovimiento?->nombre ?? 'Egreso';
                $this->aplicarEfectoSaldo(
                    $tipoNuevo,
                    (float) $movimiento->monto,
                    $movimiento->cuenta_origen_id,
                    $movimiento->cuenta_destino_id,
                    +1
                );
            });

            return response()->json([
                'mensaje' => 'Registro actualizado exitosamente: ID = ' . $id,
                'data'    => $movimiento
            ], 200);

        } catch (Exception $e) {
            return response()->json([
                'mensaje' => 'Registro NO actualizado ID = ' . $id . ': ' . $e->getMessage()
            ], 500);
        }
    }

    // ELIMINAR un movimiento
    public function destroy(Request $request, $id)
    {
        $userId = auth()->id();

        $movimiento = MovimientoModel::with('concepto.tipoMovimiento')
            ->where('id', $id)
            ->where(function ($q) use ($userId) {
                $q->whereHas('cuentaOrigen',  fn($q) => $q->where('user_id', $userId))
                  ->orWhereHas('cuentaDestino', fn($q) => $q->where('user_id', $userId));
            })
            ->firstOrFail();

        // Regla de negocio: sólo se pueden eliminar movimientos del día actual del cliente.
        if (!$this->esDelDiaActual($movimiento->fecha, $this->clientTimezone($request))) {
            return response()->json([
                'mensaje' => 'Solo se pueden eliminar movimientos registrados hoy.'
            ], 403);
        }

        try {
            DB::transaction(function () use ($movimiento) {
                $tipo = $movimiento->concepto?->tipoMovimiento?->nombre ?? 'Egreso';
                $this->aplicarEfectoSaldo(
                    $tipo,
                    (float) $movimiento->monto,
                    $movimiento->cuenta_origen_id,
                    $movimiento->cuenta_destino_id,
                    -1
                );

                $movimiento->delete();
            });

            return response()->json([
                'mensaje' => 'Registro eliminado exitosamente: ID = ' . $id,
                'data'    => $movimiento
            ], 200);

        } catch (Exception $e) {
            return response()->json([
                'mensaje' => 'Registro NO eliminado ID = ' . $id . ': ' . $e->getMessage()
            ], 500);
        }
    }
}
