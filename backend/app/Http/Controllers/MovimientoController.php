<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\MovimientoModel;
use Exception;

class MovimientoController
{

    public function index()
    {
        $data = MovimientoModel::all();
        return response()->json([
            'mensaje' => 'Listado de Movimientos',
            'data' => $data
        ], 200);
    }

public function store(Request $request)
{
    $request->validate([
        'monto' => 'required|numeric',
        'cuenta_origen_id' => 'required|integer',
        'cuenta_destino_id' => 'required|integer',
        'concepto_id' => 'required|integer',
        'nota' => 'nullable|string|max:255'
    ]);
    try {
        $nuevoMovimiento = MovimientoModel::create($request->only('monto', 'cuenta_origen_id', 'cuenta_destino_id', 'concepto_id', 'nota'));
        return response()->json([
            'mensaje'=>'Nuevo registro agregado exitosamente',
            'data' => $nuevoMovimiento
        ], 201);

    } catch (Exception $e) {
        return response()->json([
            'mensaje' => 'Nuevo registro NO agregado',
        ], 500);
    }
}


    public function show(string $id)
    {
        $data = MovimientoModel::findOrFail($id);
        return response()->json([
            'mensaje' => 'Registro encontrado: ID = ' . $id,
            'data' => $data
        ], 200);
    }


    public function update(Request $request, string $id)
    {
        $request->validate([
        'monto' => 'sometimes|required|numeric',
        'cuenta_origen_id' => 'sometimes|required|integer',
        'cuenta_destino_id' => 'sometimes|required|integer',
        'concepto_id' => 'sometimes|required|integer',
        'nota' => 'sometimes|nullable|string|max:255'
        ]);
        try {
            $data = MovimientoModel::findOrFail($id);
            $data->update($request->only('monto', 'cuenta_origen_id','cuenta_destino_id','concepto_id','nota',));
            return response()->json([
                'mensaje'=>'Registro acatualizado exitosamente: ID = '.$id,
                'data'=>$data
                ],200);
        } catch (Exception $e) {
            return response()->json([
                'mensaje'=>'Registro NO actualizado ID = '.$id,
                ],500);
        }
    }

    public function destroy(string $id)
    {
        try {
            $data = MovimientoModel::findOrFail($id);
            $data->delete();
            return response()->json([
                'mensaje' => 'Registro eliminado exitosamente: ID = ' . $id,
                'data' => $data
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'mensaje' => 'Registro NO eliminado ID = ' . $id,
            ], 500);
        }
    }

}
