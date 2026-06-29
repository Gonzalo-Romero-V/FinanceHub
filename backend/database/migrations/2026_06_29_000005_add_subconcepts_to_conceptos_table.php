<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('conceptos', function (Blueprint $table) {
            $table->unsignedBigInteger('parent_id')->nullable()->after('user_id');
            $table->string('color', 7)->nullable()->after('parent_id'); // hex #rrggbb
            $table->foreign('parent_id')->references('id')->on('conceptos')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('conceptos', function (Blueprint $table) {
            $table->dropForeign(['parent_id']);
            $table->dropColumn(['parent_id', 'color']);
        });
    }
};
