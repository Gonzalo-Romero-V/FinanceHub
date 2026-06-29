<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_settings', function (Blueprint $table) {
            // Reemplaza frecuencia_dias genérico por schema estructurado
            $table->string('reconciliacion_tipo', 20)->default('ninguno')->after('user_id');
            $table->tinyInteger('reconciliacion_dia_semana')->unsigned()->nullable()->after('reconciliacion_tipo');
            $table->tinyInteger('reconciliacion_dia_mes')->unsigned()->nullable()->after('reconciliacion_dia_semana');
            // reconciliacion_frecuencia_dias se mantiene para tipo 'personalizado'
        });
    }

    public function down(): void
    {
        Schema::table('user_settings', function (Blueprint $table) {
            $table->dropColumn(['reconciliacion_tipo', 'reconciliacion_dia_semana', 'reconciliacion_dia_mes']);
        });
    }
};
