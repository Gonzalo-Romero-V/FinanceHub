<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('presupuestos', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->bigInteger('user_id')->index();
            $table->bigInteger('concepto_id')->index();
            $table->decimal('monto', 14, 2);
            $table->string('ventana', 20); // 'diario' | 'semanal' | 'mensual' | 'anual'
            $table->json('umbrales')->default('[50,75,90]');
            $table->boolean('activo')->default(true);
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('concepto_id')->references('id')->on('conceptos')->onDelete('cascade');
            $table->unique(['user_id', 'concepto_id', 'ventana']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('presupuestos');
    }
};
