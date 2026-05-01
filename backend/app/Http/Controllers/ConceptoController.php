<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ConceptoModel;
use Exception;

class ConceptoController
{
    // Crear nuevo concepto
    public function store(Request $request)
    {
        $request->validate([
            'nombre' => 'required|string|max:255',
            'tipo_movimiento_id' => 'required|integer|exists:tipos_movimiento,id'
        ]);

        try {
            $nuevoConcepto = ConceptoModel::create([
                'nombre' => $request->nombre,
                'tipo_movimiento_id' => $request->tipo_movimiento_id,
                'user_id' => auth()->id(),
            ]);

            return response()->json([
                'mensaje' => 'Nuevo registro agregado exitosamente',
                'data' => $nuevoConcepto
            ], 201);

        } catch (Exception $e) {
            return response()->json([
                'mensaje' => 'Nuevo registro NO agregado',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // Listar todos los conceptos del usuario autenticado
    public function index()
    {
        $userId = auth()->id();

        $data = ConceptoModel::where('user_id', $userId)
            ->with(['tipoMovimiento'])
            ->withSum(['movimientos as total_monto' => function ($query) use ($userId) {
                $query->whereHas('cuentaOrigen', function ($q) use ($userId) {
                    $q->where('user_id', $userId);
                });
            }], 'monto')
            ->get();

        return response()->json([
            'mensaje' => 'Lista de Conceptos',
            'data' => $data
        ], 200);
    }

    // Mostrar un concepto específico del usuario autenticado
    public function show($id)
    {
        $data = ConceptoModel::where('user_id', auth()->id())->findOrFail($id);

        return response()->json([
            'mensaje' => 'Elemento encontrado: ID = ' . $id,
            'data' => $data
        ], 200);
    }

    // Actualizar un concepto
    public function update(Request $request, $id)
    {
        $request->validate([
            'nombre' => 'sometimes|required|string|max:255',
            'tipo_movimiento_id' => 'sometimes|required|integer|exists:tipos_movimiento,id'
        ]);

        try {
            $data = ConceptoModel::where('user_id', auth()->id())->findOrFail($id);
            $data->update($request->only(['nombre', 'tipo_movimiento_id']));

            return response()->json([
                'mensaje' => 'Elemento actualizado exitosamente: ID = ' . $id,
                'data' => $data
            ], 200);

        } catch (Exception $e) {
            return response()->json([
                'mensaje' => 'Registro NO actualizado ID = ' . $id,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // Eliminar un concepto
    public function destroy($id)
    {
        try {
            $data = ConceptoModel::where('user_id', auth()->id())->findOrFail($id);
            $data->delete();

            return response()->json([
                'mensaje' => 'Registro eliminado exitosamente: ID = ' . $id,
            ], 200);

        } catch (Exception $e) {
            return response()->json([
                'mensaje' => 'Registro NO eliminado ID = ' . $id,
                'error' => $e->getMessage()
            ], 500);
        }
    }
}