<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('deudas', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->bigInteger('user_id')->index();
            $table->string('nombre', 100);
            $table->string('acreedor', 100)->nullable();
            $table->string('sistema', 20); // frances|aleman|bullet
            $table->decimal('monto_original', 14, 2);
            $table->integer('plazo_meses');
            $table->date('fecha_inicio');
            $table->decimal('tasa_mensual', 8, 6)->nullable();
            $table->decimal('cuota_directa', 14, 2)->nullable();
            $table->decimal('total_informal', 14, 2)->nullable();
            $table->text('notas')->nullable();
            $table->string('estado', 20)->default('activa');
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('deudas');
    }
};
