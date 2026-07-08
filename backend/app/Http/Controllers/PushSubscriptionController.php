<?php

namespace App\Http\Controllers;

use App\Models\PushSubscriptionModel;
use Illuminate\Http\Request;

class PushSubscriptionController
{
    // REGISTRAR/ACTUALIZAR un canal de push para el dispositivo actual.
    // Un mismo usuario puede tener varios (web + Android, o varios navegadores).
    public function store(Request $request)
    {
        $request->validate([
            'tipo' => 'required|in:web,fcm',
            'identificador' => 'required|string',
            // "required" en un array vacío falla en Laravel (lo trata como
            // "no presente") — FCM no necesita nada más que el token, así
            // que manda payload: {} vacío desde el cliente nativo, cosa que
            // web push nunca hace (siempre manda { keys: ... }). Por eso
            // esto solo rompía el registro de notificaciones en Android.
            'payload' => 'nullable|array',
        ]);

        $subscription = PushSubscriptionModel::updateOrCreate(
            [
                'user_id' => auth()->id(),
                'identificador' => $request->identificador,
            ],
            [
                'tipo' => $request->tipo,
                'payload' => $request->payload ?? [],
            ]
        );

        return response()->json([
            'mensaje' => 'Canal de notificaciones registrado',
            'data' => $subscription,
        ], 201);
    }

    // DESREGISTRAR (ej. el usuario desactiva notificaciones en ese dispositivo)
    public function destroy(Request $request)
    {
        $request->validate([
            'identificador' => 'required|string',
        ]);

        PushSubscriptionModel::where('user_id', auth()->id())
            ->where('identificador', $request->identificador)
            ->delete();

        return response()->json(['mensaje' => 'Canal de notificaciones eliminado'], 200);
    }
}
