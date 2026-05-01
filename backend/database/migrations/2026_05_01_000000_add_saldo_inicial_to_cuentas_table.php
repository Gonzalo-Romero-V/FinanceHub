<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cuentas', function (Blueprint $table) {
            // Guardamos el saldo de apertura como referencia de auditoría.
            // El campo 'saldo' existente pasa a ser el saldo corriente actualizado por movimientos.
            $table->decimal('saldo_inicial', 14, 2)->default(0)->after('saldo');
        });

        // Inicializamos saldo_inicial con el valor actual de saldo para registros existentes.
        // Estos datos son de prueba, no se recalculan desde movimientos históricos.
        DB::statement('UPDATE cuentas SET saldo_inicial = saldo');
    }

    public function down(): void
    {
        Schema::table('cuentas', function (Blueprint $table) {
            $table->dropColumn('saldo_inicial');
        });
    }
};
