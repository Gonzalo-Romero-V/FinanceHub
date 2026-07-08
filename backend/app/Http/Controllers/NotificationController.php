<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class NotificationController
{
    // LISTAR — últimas 50, más recientes primero (igual que el orden nativo
    // de Laravel para la relación notifications()).
    public function index()
    {
        $user = auth()->user();

        return response()->json([
            'mensaje' => 'Notificaciones',
            'data' => $user->notifications()->limit(50)->get(),
            'unread_count' => $user->unreadNotifications()->count(),
        ], 200);
    }

    // MARCAR UNA COMO LEÍDA
    public function markRead(Request $request, string $id)
    {
        $notification = auth()->user()->notifications()->where('id', $id)->first();

        if (!$notification) {
            return response()->json(['mensaje' => 'Notificación no encontrada'], 404);
        }

        $notification->markAsRead();

        return response()->json(['mensaje' => 'Notificación marcada como leída'], 200);
    }

    // MARCAR TODAS COMO LEÍDAS
    public function markAllRead()
    {
        auth()->user()->unreadNotifications->markAsRead();

        return response()->json(['mensaje' => 'Todas las notificaciones marcadas como leídas'], 200);
    }
}
