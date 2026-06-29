<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reconciliaciones', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->bigInteger('cuenta_id')->index();
            $table->bigInteger('user_id')->index();
            $table->decimal('saldo_real', 14, 2);
            $table->decimal('saldo_sistema', 14, 2);
            $table->decimal('diferencia', 14, 2);
            $table->bigInteger('movimiento_ajuste_id')->nullable();
            $table->string('nota')->nullable();
            $table->timestamp('fecha')->useCurrent();

            $table->foreign('cuenta_id')->references('id')->on('cuentas')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('movimiento_ajuste_id')->references('id')->on('movimientos')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reconciliaciones');
    }
};
