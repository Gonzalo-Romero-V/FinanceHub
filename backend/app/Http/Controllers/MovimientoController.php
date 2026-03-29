<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\MovimientoModel;
use App\Models\CuentaModel;
use App\Models\ConceptoModel;
use Exception;

class MovimientoController
{
    // LISTAR movimientos del usuario
    public function index()
    {
        $userId = auth()->id();

        $data = MovimientoModel::whereHas('cuentaOrigen', fn($q) => $q->where('user_id', $userId))
            ->orWhereHas('cuentaDestino', fn($q) => $q->where('user_id', $userId))
            ->get();

        return response()->json([
            'mensaje' => 'Listado de Movimientos',
            'data' => $data
        ], 200);
    }

    // CREAR nuevo movimiento
    public function store(Request $request)
    {
        $request->validate([
            'monto' => 'required|numeric',
            'cuenta_origen_id' => 'required|integer',
            'cuenta_destino_id' => 'required|integer',
            'concepto_id' => 'required|integer',
            'nota' => 'nullable|string|max:255'
        ]);

        $userId = auth()->id();

        $cuentaOrigen = CuentaModel::where('id', $request->cuenta_origen_id)
            ->where('user_id', $userId)
            ->firstOrFail();

        $cuentaDestino = CuentaModel::where('id', $request->cuenta_destino_id)
            ->where('user_id', $userId)
            ->firstOrFail();

        $concepto = ConceptoModel::where('id', $request->concepto_id)
            ->where('user_id', $userId)
            ->firstOrFail();

        try {
            $nuevoMovimiento = MovimientoModel::create($request->only(
                'monto',
                'cuenta_origen_id',
                'cuenta_destino_id',
                'concepto_id',
                'nota'
            ));

            return response()->json([
                'mensaje' => 'Nuevo registro agregado exitosamente',
                'data' => $nuevoMovimiento
            ], 201);

        } catch (Exception $e) {
            return response()->json([
                'mensaje' => 'Nuevo registro NO agregado'
            ], 500);
        }
    }

    // VER un movimiento
    public function show($id)
    {
        $userId = auth()->id();

        $data = MovimientoModel::where('id', $id)
            ->whereHas('cuentaOrigen', fn($q) => $q->where('user_id', $userId))
            ->orWhereHas('cuentaDestino', fn($q) => $q->where('user_id', $userId))
            ->firstOrFail();

        return response()->json([
            'mensaje' => 'Registro encontrado: ID = ' . $id,
            'data' => $data
        ], 200);
    }

    // ACTUALIZAR un movimiento
    public function update(Request $request, $id)
    {
        $request->validate([
            'monto' => 'sometimes|required|numeric',
            'cuenta_origen_id' => 'sometimes|required|integer',
            'cuenta_destino_id' => 'sometimes|required|integer',
            'concepto_id' => 'sometimes|required|integer',
            'nota' => 'sometimes|nullable|string|max:255'
        ]);

        $userId = auth()->id();

        $movimiento = MovimientoModel::where('id', $id)
            ->whereHas('cuentaOrigen', fn($q) => $q->where('user_id', $userId))
            ->orWhereHas('cuentaDestino', fn($q) => $q->where('user_id', $userId))
            ->firstOrFail();

        $datos = $request->only('monto', 'cuenta_origen_id', 'cuenta_destino_id', 'concepto_id', 'nota');

        if (empty($datos)) {
            return response()->json([
                'mensaje' => 'No se enviaron campos para actualizar'
            ], 400);
        }

        try {
            $movimiento->update($datos);
            return response()->json([
                'mensaje' => 'Registro actualizado exitosamente: ID = ' . $id,
                'data' => $movimiento
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'mensaje' => 'Registro NO actualizado ID = ' . $id
            ], 500);
        }
    }

    // ELIMINAR un movimiento
    public function destroy($id)
    {
        $userId = auth()->id();

        $movimiento = MovimientoModel::where('id', $id)
            ->whereHas('cuentaOrigen', fn($q) => $q->where('user_id', $userId))
            ->orWhereHas('cuentaDestino', fn($q) => $q->where('user_id', $userId))
            ->firstOrFail();

        try {
            $movimiento->delete();
            return response()->json([
                'mensaje' => 'Registro eliminado exitosamente: ID = ' . $id,
                'data' => $movimiento
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'mensaje' => 'Registro NO eliminado ID = ' . $id
            ], 500);
        }
    }
}