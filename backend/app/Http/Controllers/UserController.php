<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\UserModel;
use Exception;

class UserController
{

    // LISTAR (solo admin)
    public function index()
    {
        if (auth()->user()->role !== 'admin') {
            return response()->json([
                'mensaje' => 'No autorizado'
            ], 403);
        }

        $data = UserModel::all();

        return response()->json([
            'mensaje' => 'Listado de usuarios',
            'data' => $data
        ], 200);
    }


    // VER PERFIL PROPIO O ADMIN
    public function show($id)
    {
        $user = UserModel::find($id);

        if ($user === null) {
            return response()->json([
                'mensaje' => 'Usuario no encontrado'
            ], 404);
        }

        if (auth()->id() !== $user->id && auth()->user()->role !== 'admin') {
            return response()->json([
                'mensaje' => 'No autorizado'
            ], 403);
        }

        return response()->json([
            'mensaje' => 'Usuario encontrado',
            'data' => $user
        ], 200);
    }


    // ACTUALIZAR
    public function update(Request $request, $id)
    {
        $request->validate([
            'name' => 'sometimes|string|max:100',
            'email' => 'sometimes|email',
            'password' => 'sometimes|string|min:6'
        ]);

        $datos = $request->only(['name', 'email', 'password']);

        if (empty($datos)) {
            return response()->json([
                'mensaje' => 'No se enviaron campos para actualizar'
            ], 400);
        }

        $user = UserModel::find($id);

        if ($user === null) {
            return response()->json([
                'mensaje' => 'Usuario no encontrado'
            ], 404);
        }

        if (auth()->id() !== $user->id && auth()->user()->role !== 'admin') {
            return response()->json([
                'mensaje' => 'No autorizado'
            ], 403);
        }

        try {

            $user->update($datos);

            return response()->json([
                'mensaje' => 'Usuario actualizado correctamente',
                'data' => $user
            ], 200);

        } catch (Exception $e) {
            return response()->json([
                'mensaje' => 'Error al actualizar usuario'
            ], 500);
        }
    }


    // ELIMINAR (solo admin)
    public function destroy($id)
    {
        if (auth()->user()->role !== 'admin') {
            return response()->json([
                'mensaje' => 'No autorizado'
            ], 403);
        }

        $user = UserModel::find($id);

        if ($user === null) {
            return response()->json([
                'mensaje' => 'Usuario no encontrado'
            ], 404);
        }

        try {

            $user->delete();

            return response()->json([
                'mensaje' => 'Usuario eliminado correctamente'
            ], 200);

        } catch (Exception $e) {
            return response()->json([
                'mensaje' => 'Error al eliminar usuario'
            ], 500);
        }
    }
}