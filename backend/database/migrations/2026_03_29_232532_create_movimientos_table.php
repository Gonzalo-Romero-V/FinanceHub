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
        Schema::create('movimientos', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->decimal('monto', 14);
            $table->bigInteger('cuenta_origen_id')->nullable();
            $table->bigInteger('cuenta_destino_id')->nullable();
            $table->bigInteger('concepto_id');
            $table->string('nota')->nullable();
            $table->timestamp('fecha')->nullable()->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('movimientos');
    }
};
