<?php

namespace App\Http\Controllers;

use App\Models\TipoCuentaModel;

class TipoCuentaController
{
    public function index()
    {
        $data = TipoCuentaModel::all();
        return response()->json([
            'mensaje' => 'Listado de Tipos de Cuenta',
            'data'    => $data
        ], 200);
    }
}
