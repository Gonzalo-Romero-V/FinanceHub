<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cuotas', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->bigInteger('deuda_id')->index();
            $table->integer('numero_cuota');
            $table->date('fecha_vencimiento');
            $table->decimal('cuota_total', 14, 2);
            $table->decimal('capital', 14, 2)->nullable();
            $table->decimal('interes', 14, 2)->nullable();
            $table->decimal('saldo_restante', 14, 2);
            $table->boolean('pagada')->default(false);
            $table->timestamp('fecha_pago')->nullable();
            $table->bigInteger('movimiento_id')->nullable();

            $table->foreign('deuda_id')->references('id')->on('deudas')->onDelete('cascade');
            $table->foreign('movimiento_id')->references('id')->on('movimientos')->onDelete('set null');
            $table->unique(['deuda_id', 'numero_cuota']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cuotas');
    }
};
