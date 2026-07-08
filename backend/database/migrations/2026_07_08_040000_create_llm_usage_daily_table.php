<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Contador de uso diario del LLM service por usuario (rate limiting de
// costos de IA). El schema vive acá porque Laravel gestiona esta DB
// compartida, pero quien lee/escribe esta tabla en tiempo real es el
// llm-service (FastAPI, acceso directo a Postgres) — mismo patrón que
// `personal_access_tokens` ya usa para validar tokens sin llamar a Laravel.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('llm_usage_daily', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->date('usage_date');
            $table->unsignedInteger('count')->default(0);
            $table->timestamps();

            $table->unique(['user_id', 'usage_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('llm_usage_daily');
    }
};
