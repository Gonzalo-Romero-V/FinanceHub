<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\CuentaModel;
use Exception;

class CuentaController
{
    // CREAR
    public function store(Request $request)
    {
        $request->validate([
            'nombre'        => 'required|string|max:100',
            'tipo_cuenta_id'=> 'required|integer',
            'saldo'         => 'required|numeric|min:0',
            'activa'        => 'required|boolean'
        ]);

        $data = $request->only(['nombre', 'tipo_cuenta_id', 'saldo', 'activa']);
        $data['user_id']       = auth()->id();
        // El saldo inicial es el saldo de apertura; el saldo corriente parte igual.
        $data['saldo_inicial'] = $data['saldo'];

        try {
            $cuenta = CuentaModel::create($data);
            return response()->json([
                'mensaje' => 'Cuenta creada exitosamente',
                'data'    => $cuenta
            ], 201);
        } catch (Exception $e) {
            return response()->json(['mensaje' => 'Error al crear la cuenta'], 500);
        }
    }

    // LISTAR
    public function index()
    {
        $cuentas = CuentaModel::with('tipoCuenta')->where('user_id', auth()->id())->get();
        return response()->json([
            'mensaje' => 'Listado de Cuentas',
            'data' => $cuentas
        ], 200);
    }

    // BUSCAR
    public function show($id)
    {
        $cuenta = CuentaModel::with('tipoCuenta')->where('id', $id)
            ->where('user_id', auth()->id())
            ->firstOrFail();

        return response()->json([
            'mensaje' => 'Cuenta encontrada',
            'data' => $cuenta
        ], 200);
    }

    // ACTUALIZAR
    public function update(Request $request, $id)
    {
        $request->validate([
            'nombre'        => 'sometimes|string|max:100',
            'tipo_cuenta_id'=> 'sometimes|integer',
            // 'saldo' está intencionalmente excluido: solo se modifica mediante movimientos.
            'activa'        => 'sometimes|boolean'
        ]);

        $cuenta = CuentaModel::where('id', $id)
            ->where('user_id', auth()->id())
            ->firstOrFail();

        // Solo permitimos editar metadatos; el saldo es gestionado por movimientos.
        $cuenta->update($request->only(['nombre', 'tipo_cuenta_id', 'activa']));

        return response()->json([
            'mensaje' => 'Cuenta actualizada exitosamente',
            'data'    => $cuenta
        ], 200);
    }

    // DESACTIVAR
    public function deactivate($id)
    {
        $cuenta = CuentaModel::where('id', $id)
            ->where('user_id', auth()->id())
            ->firstOrFail();

        if (!$cuenta->activa) {
            return response()->json(['mensaje' => 'La cuenta ya está desactivada'], 200);
        }

        $cuenta->update(['activa' => false]);

        return response()->json(['mensaje' => 'Cuenta desactivada correctamente'], 200);
    }

    // ELIMINAR
    public function destroy($id)
    {
        $cuenta = CuentaModel::where('id', $id)
            ->where('user_id', auth()->id())
            ->firstOrFail();

        try {
            $cuenta->delete();
            return response()->json(['mensaje' => 'Cuenta eliminada exitosamente'], 200);
        } catch (Exception $e) {
            return response()->json(['mensaje' => 'Error al eliminar la cuenta'], 500);
        }
    }
}