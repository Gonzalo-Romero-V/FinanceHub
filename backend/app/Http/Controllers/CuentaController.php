<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\CuentaModel;
use Exception;

class CuentaController
{


    // CREAR       C
    public function store(Request $request){
               
        $request->validate([
            'nombre' => 'required|string|max:100',
            'tipo_cuenta' => 'required|string',
            'saldo' => 'required|numeric|min:0',
            'activa' => 'required|boolean'
        ]);

        try{
            $nuevaCuenta = CuentaModel::create($request->only(['nombre', 'tipo_cuenta', 'saldo', 'activa']));
            return response ()->json([
                                    'mensaje'=>'Nuevo registro agregado exitosamente con ID = '. $nuevaCuenta->id,
                                    'data'=>$nuevaCuenta
                                    ],
                                    201);
        }catch(Exception $e){
            return response()->json([
                                    'mensaje'=>'Hubo un problema, NO se agrego NINGUN REGISTRO'
                                    ],
                                    500);        
        }
    }
    
    // LISTAR      R 
    public function index(){
        $indexCuentas = CuentaModel::all();
        return response()->json([
                                'mensaje'=>'Listado de Cuentas',
                                'data'=>$indexCuentas
                                ],
                                200);
    }
    

    // BUSCAR      R
    public function show($id){
        $data = CuentaModel::find($id);
        if($data !== null){
            return response()->json([
                                    'mensaje'=>'El Registro con ID = '.$id.' fue encontrado',
                                    'data'=>$data
                                    ],
                                    200);    
        }else{
            return response()->json([
                                    'mensaje'=>'El Registro con ID = '.$id.' NO fue encontrado'
                                    ],
                                    404);    
        }

    }

    // EDITAR      U
    public function update(Request $request, $id ){

        $request->validate([
            'nombre' => 'sometimes|string|max:100',
            'tipo_cuenta' => 'sometimes|string',
            'saldo' => 'sometimes|numeric|min:0',
            'activa' => 'sometimes|boolean'
        ]);

        $datos = $request->only(['nombre','tipo_cuenta','saldo','activa']);

        if (empty($datos)) {
            return response()->json([
                'mensaje' => 'No se enviaron campos para actualizar'
            ], 400);
        }

        $row = CuentaModel::find($id);

        if ($row !== null){
            try{
                $row->update($datos);
                return response()->json([
                                        'mensaje'=>'El Registro con ID = '.$id.' fue actualizado ',
                                        'data'=>$row
                                        ],
                                        200);
            }catch(Exception $e){
                return response()->json([
                                        'mensaje'=>'Hubo un problema, el registro con ID ='. $id . ' NO fue actualizado.'
                                        ],
                                        500);                        
            }
        }else{
            return response()->json([
                                    'mensaje'=>'El Registro con ID = '.$id.' NO fue encontrado',
                                    ],
                                    404);
        }
    }

    public function destroy($id){

    $cuenta = CuentaModel::findOrFail($id);

    if (!$cuenta->activa) {
        return response()->json([
            'mensaje' => 'La cuenta ya se encuentra desactivada'
        ], 200);
    }

    $cuenta->activa = false;
    $cuenta->save();

    return response()->json([
        'mensaje' => 'La cuenta fue desactivada correctamente'
    ], 200);
    
    }




   /*  // ELMIMINAR   D
    public function destroy($id){
        $row = CuentaModel::find($id);
        if ($row !== null){
            try{
                $row->delete();
                return response()->json([
                                        'mensaje'=>'El registro con ID = '. $id .' fue eliminado de forma exitosa'
                                        ],
                                        200);
            }catch(Exception $e){
                return response()->json([
                                        'mensaje'=>'Hubo un problema, el registro con ID ='. $id . ' NO fue eliminado.'                                        ],
                                        500);
            }
        }else{
            return response()->json([
                                    'mensaje'=>'El registro con ID = '. $id. ' NO fue encontrado'
                                    ],
                                    404
                                    );
        }
    } */
}
