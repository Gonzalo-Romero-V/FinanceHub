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
        Schema::create('cuentas', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('nombre', 100);
            $table->bigInteger('tipo_cuenta_id')->index('idx_cuentas_tipo_cuenta_id');
            $table->decimal('saldo', 14)->default(0);
            $table->boolean('activa')->default(true)->index('idx_cuentas_activa');
            $table->timestamp('fecha_creacion')->nullable()->useCurrent();
            $table->bigInteger('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cuentas');
    }
};
