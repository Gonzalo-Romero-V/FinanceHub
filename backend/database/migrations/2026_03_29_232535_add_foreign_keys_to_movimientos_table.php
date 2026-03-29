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
        Schema::table('movimientos', function (Blueprint $table) {
            $table->foreign(['concepto_id'], 'fk_mov_concepto')->references(['id'])->on('conceptos')->onUpdate('no action')->onDelete('no action');
            $table->foreign(['cuenta_destino_id'], 'fk_mov_destino')->references(['id'])->on('cuentas')->onUpdate('no action')->onDelete('no action');
            $table->foreign(['cuenta_origen_id'], 'fk_mov_origen')->references(['id'])->on('cuentas')->onUpdate('no action')->onDelete('no action');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('movimientos', function (Blueprint $table) {
            $table->dropForeign('fk_mov_concepto');
            $table->dropForeign('fk_mov_destino');
            $table->dropForeign('fk_mov_origen');
        });
    }
};
