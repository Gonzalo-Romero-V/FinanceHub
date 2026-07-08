<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Mismo mecanismo que conceptos.color (hex #rrggbb, nullable) — a diferencia
// de conceptos, cuentas es una tabla plana sin jerarquía padre/hijo, así que
// no hace falta ninguna regla de "solo raíces".
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cuentas', function (Blueprint $table) {
            $table->string('color', 7)->nullable()->after('tipo_cuenta_id');
        });
    }

    public function down(): void
    {
        Schema::table('cuentas', function (Blueprint $table) {
            $table->dropColumn('color');
        });
    }
};
