<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ConceptoModel;
use Exception;


class ConceptoController
{
    public function store(Request $request){
        $request->validate([
        'nombre' => 'required|string|max:255',
        'tipo_movimiento_id' => 'required|integer'
        ]);
        try {
            $nuevoConcepto = ConceptoModel::create($request->only('nombre','tipo_movimiento_id'));
            return response()->json([
                'mensaje'=>'Nuevo registro agregado exitosamente',
                'data'=>$nuevoConcepto
                ],
                201); 
        } catch (Exception $e) {
            return response()->json([
                'mensaje'=>'Nuevo registro NO agregado',
                ],
                500); 
        }
    }

    public function index(){
        $data = ConceptoModel::all();
        return response()->json([
            'mensaje'=>'Lista de Conceptos',
            'data'=>$data
            ],
            200);
    }

    public function show($id){
        $data = ConceptoModel::findOrFail($id);
        return response()->json([
            'mensaje'=>'Elemento encontrado: ID = '.$id,
            'data'=>$data
            ],
            200);
    }

    public function update(Request $request, $id){
        $request->validate([
        'nombre' => 'sometimes|required|string|max:255',
        'tipo_movimiento_id' => 'sometimes|required|integer'
        ]);
        try {
            $data = ConceptoModel::findOrFail($id);
            $data->update($request->only('nombre','tipo_movimiento_id'));
            return response()->json([
                'mensaje'=>'Elemento actualizado exitosamente: ID = '.$id,
                'data'=>$data
                ],
                200);
        } catch (Exception $e) {
            return response()->json([
                'mensaje'=>'Registro NO actualizado ID = '.$id,
                ],
                500);
        }
    }

    public function destroy($id){
        try {
            $data = ConceptoModel::findOrFail($id);
            $data->delete();
            return response()->json([
                'mensaje'=>'Registro eliminado exitosamente: ID = '.$id,
                ],
                200);
        } catch (Exception $e) {
                return response()->json([
                'mensaje'=>'Registro NO eliminado ID = '.$id,
                ],
                500);
        }
    }


}
