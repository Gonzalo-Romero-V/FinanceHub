<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Un usuario puede tener varios dispositivos/navegadores registrados a la
// vez (web + Android simultáneamente, o varios navegadores) — cada fila es
// un canal de push independiente. "tipo" distingue el transporte porque
// Web Push (endpoint + claves VAPID) y FCM (token) son payloads distintos;
// "payload" guarda lo que cada transporte necesita para mandar el push.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('push_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->enum('tipo', ['web', 'fcm']);
            $table->text('identificador'); // endpoint (web) o device token (fcm)
            $table->jsonb('payload'); // claves p256dh/auth (web) o metadata (fcm)
            $table->timestamps();

            $table->unique(['user_id', 'identificador']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('push_subscriptions');
    }
};
