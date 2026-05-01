<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\MovimientoModel;
use App\Models\CuentaModel;
use App\Models\ConceptoModel;
use Illuminate\Support\Facades\DB;
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
            'fecha'            => 'nullable|date',
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
                $nuevoMovimiento = MovimientoModel::create($request->only(
                    'monto', 'cuenta_origen_id', 'cuenta_destino_id', 'concepto_id', 'nota', 'fecha'
                ));

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
            'fecha'            => 'sometimes|nullable|date',
        ]);

        $userId = auth()->id();

        $movimiento = MovimientoModel::with('concepto.tipoMovimiento')
            ->where('id', $id)
            ->where(function ($q) use ($userId) {
                $q->whereHas('cuentaOrigen',  fn($q) => $q->where('user_id', $userId))
                  ->orWhereHas('cuentaDestino', fn($q) => $q->where('user_id', $userId));
            })
            ->firstOrFail();

        $datos = $request->only('monto', 'cuenta_origen_id', 'cuenta_destino_id', 'concepto_id', 'nota', 'fecha');

        if (empty($datos)) {
            return response()->json(['mensaje' => 'No se enviaron campos para actualizar'], 400);
        }

        try {
            DB::transaction(function () use ($movimiento, $datos, $userId) {
                // 1. Revertir el efecto del movimiento anterior
                $tipoAnterior = $movimiento->concepto?->tipoMovimiento?->nombre ?? 'Egreso';
                $this->aplicarEfectoSaldo(
                    $tipoAnterior,
                    (float) $movimiento->monto,
                    $movimiento->cuenta_origen_id,
                    $movimiento->cuenta_destino_id,
                    -1  // revertir
                );

                // 2. Aplicar los nuevos datos
                $movimiento->update($datos);
                $movimiento->refresh()->load('concepto.tipoMovimiento');

                // 3. Reaplicar con los nuevos valores
                $tipoNuevo = $movimiento->concepto?->tipoMovimiento?->nombre ?? 'Egreso';
                $this->aplicarEfectoSaldo(
                    $tipoNuevo,
                    (float) $movimiento->monto,
                    $movimiento->cuenta_origen_id,
                    $movimiento->cuenta_destino_id,
                    +1  // aplicar
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
    public function destroy($id)
    {
        $userId = auth()->id();

        $movimiento = MovimientoModel::with('concepto.tipoMovimiento')
            ->where('id', $id)
            ->where(function ($q) use ($userId) {
                $q->whereHas('cuentaOrigen',  fn($q) => $q->where('user_id', $userId))
                  ->orWhereHas('cuentaDestino', fn($q) => $q->where('user_id', $userId));
            })
            ->firstOrFail();

        try {
            DB::transaction(function () use ($movimiento) {
                // Revertir el efecto del movimiento antes de eliminarlo
                $tipo = $movimiento->concepto?->tipoMovimiento?->nombre ?? 'Egreso';
                $this->aplicarEfectoSaldo(
                    $tipo,
                    (float) $movimiento->monto,
                    $movimiento->cuenta_origen_id,
                    $movimiento->cuenta_destino_id,
                    -1  // revertir
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