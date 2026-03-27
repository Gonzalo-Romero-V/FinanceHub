<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\TipoMovimientoModel;

class TipoMovimientoController
{
    public function index(){
        $data = TipoMovimientoModel::all();
        return response()->json([
            'mensaje'=>'Listado de Tipos de Movimiento',
            'data'=>$data]
            ,200);
    }

    public function show($id){
        $data = TipoMovimientoModel::findOrFail($id);
        return response()->json([
            'mensaje'=>'Elemento encontrado: ID = '.$id,
            'data'=>$data],200);
    }
}
