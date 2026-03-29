<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('conceptos', function (Blueprint $table) {
            $table->foreign(['tipo_movimiento_id'])->references(['id'])->on('tipos_movimiento')->onUpdate('no action')->onDelete('no action');
            $table->foreign(['user_id'])->references(['id'])->on('users')->onUpdate('no action')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('conceptos', function (Blueprint $table) {
            $table->dropForeign('conceptos_tipo_movimiento_id_foreign');
            $table->dropForeign('conceptos_user_id_foreign');
        });
    }
};
