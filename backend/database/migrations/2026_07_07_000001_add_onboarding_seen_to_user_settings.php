<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_settings', function (Blueprint $table) {
            $table->jsonb('onboarding_seen')->default('{}');
        });
    }

    public function down(): void
    {
        Schema::table('user_settings', function (Blueprint $table) {
            $table->dropColumn('onboarding_seen');
        });
    }
};
