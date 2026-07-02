<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('deudas', function (Blueprint $table) {
            $table->bigInteger('concepto_id')->nullable()->after('estado');
            $table->foreign('concepto_id')->references('id')->on('conceptos')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('deudas', function (Blueprint $table) {
            $table->dropForeign(['concepto_id']);
            $table->dropColumn('concepto_id');
        });
    }
};
